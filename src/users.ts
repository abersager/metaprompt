import { IRequest } from 'itty-router'
import { AccessToken, SpotifyApi, Track } from '@spotify/web-api-ts-sdk'
import { currentlyPlaying, getPromptOptions, hasChanged } from './spotify'
import { inferPrompt } from './prompt-inference'
import { fetchSongMetadata } from './genius'
import { getSpotifyApi } from './auth'
import * as fal from '@fal-ai/serverless-client'
import { RealtimeConnection } from '@fal-ai/serverless-client/src/realtime'
import { encode } from '@msgpack/msgpack'

function randomSeed() {
  return Math.floor(Math.random() * 10000000).toFixed(0)
}

export async function registerSpotifyUser(request: IRequest, env: Env, context: ExecutionContext) {
  let userId = decodeURIComponent(request.params.userId)
  console.log(`Registering user ${userId}`)
  const id = env.users.idFromString(userId)
  console.log('connected', id)
  try {
    const user = env.users.get(id)
    return user.fetch(request)
  } catch (e) {
    console.error(e)
    return new Response('Error', { status: 500 })
  }
}

type Session = {
  webSocket: WebSocket
  quit?: boolean
}

const INPUT_DEFAULTS = {
  _force_msgpack: new Uint8Array([]),
  enable_safety_checker: false,
  image_size: 'square_hd',
  sync_mode: true,
  num_images: 1,
  num_inference_steps: '4',
}

export class User implements DurableObject {
  state: DurableObjectState
  storage: DurableObjectStorage
  sessions: Session[]
  sdk?: SpotifyApi
  env: Env
  falConnection: RealtimeConnection<any>

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.storage = state.storage
    console.log('clearing sessions')
    this.sessions = []
    this.env = env
    fal.config({ credentials: env.FAL_KEY })
    this.falConnection = fal.realtime.connect('fal-ai/fast-lightning-sdxl', {
      connectionKey: 'lightning-sdxl',
      throttleInterval: 64,
      onResult: this.onFalResult.bind(this),
    })
  }

  async fetch(request: IRequest) {
    let url = new URL(request.url)
    if (url.pathname === '/login') {
      const authInfo = await request.json()
      await this.storage.put('authInfo', authInfo)
      return new Response('OK')
    }

    console.log(request)

    if (request.headers.get('Upgrade') != 'websocket') {
      return new Response('expected websocket', { status: 400 })
    }

    // To accept the WebSocket request, we create a WebSocketPair (which is like a socketpair,
    // i.e. two WebSockets that talk to each other), we return one end of the pair in the
    // response, and we operate on the other end. Note that this API is not part of the
    // Fetch API standard unfortunately, the Fetch API / Service Workers specs do not define
    // any way to act as a WebSocket server today.
    let pair = new WebSocketPair()

    // We're going to take pair[1] as our end, and return pair[0] to the client.
    await this.handleSession(pair[1])

    // Now we return the other end of the pair to the client.
    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  async handleSession(webSocket: WebSocket) {
    // Accept our end of the WebSocket. This tells the runtime that we'll be terminating the
    // WebSocket in JavaScript, not sending it elsewhere.
    webSocket.accept()

    // Create our session and add it to the sessions list.
    // We don't send any messages to the client until it has sent us the initial user info
    // message. Until then, we will queue messages in `session.blockedMessages`.
    let session: Session = { webSocket }
    console.log('adding session')
    this.sessions.push(session)

    webSocket.addEventListener('message', (message) => {
      try {
        if (session.quit) {
          // Whoops, when trying to send to this WebSocket in the past, it threw an exception and
          // we marked it broken. But somehow we got another message? I guess try sending a
          // close(), which might throw, in which case we'll try to send an error, which will also
          // throw, and whatever, at least we won't accept the message. (This probably can't
          // actually happen. This is defensive coding.)
          webSocket.close(1011, 'WebSocket broken.')
          return
        }

        let data = JSON.parse(message.data as string)

        // Save message.
        this.storage.put('lastMessage', data)
      } catch (error: any) {
        // Report any exceptions directly back to the client. As with our handleErrors() this
        // probably isn't what you'd want to do in production, but it's convenient when testing.
        webSocket.send(JSON.stringify({ error: error.stack }))
      }
    })

    // On "close" and "error" events, remove the WebSocket from the sessions list and broadcast
    // a quit message.
    let closeOrErrorHandler = (_event: CloseEvent | ErrorEvent) => {
      session.quit = true
      const before = this.sessions.length
      this.sessions = this.sessions.filter((member) => member !== session)
      const after = this.sessions.length
      console.log(`removed session, ${before} -> ${after}`)
    }
    webSocket.addEventListener('close', closeOrErrorHandler)
    webSocket.addEventListener('error', closeOrErrorHandler)

    await this.scheduleAlarm()
  }

  // broadcast() broadcasts a message to all clients.
  broadcast(message: string | object) {
    message = encode(message)

    // Iterate over all the sessions sending them messages.
    this.sessions = this.sessions.filter((session) => {
      try {
        session.webSocket.send(message as string)
        return true
      } catch (err) {
        // Whoops, this connection is dead. Remove it from the list and arrange to notify
        // everyone below.
        session.quit = true
        return false
      }
    })
  }

  async getSdk() {
    if (!this.sdk) {
      const authInfo = (await this.storage.get('authInfo')) as AccessToken
      this.sdk = getSpotifyApi(this.env.SPOTIFY_CLIENT_ID, this.env.SPOTIFY_CLIENT_SECRET, authInfo)
    }
    return this.sdk
  }

  async scheduleAlarm() {
    if (this.sessions.length) {
      console.log('scheduling alarm')
      this.storage.setAlarm(Date.now() + 4000)
    } else {
      console.log('no sessions, not scheduling alarm')
    }
  }

  async alarm() {
    this.scheduleAlarm()
    const current = (await this.storage.get('current')) as Track | undefined
    const newValues = await currentlyPlaying(await this.getSdk())
    if (newValues.current && hasChanged(current, newValues.current)) {
      await this.storage.put('current', newValues.current)
      console.log('broadcasting track change')
      this.broadcast({
        type: 'current',
        artistName: newValues.current.artists.map((x) => x.name).join(', '),
        trackName: newValues.current.name,
      })

      const sdk = await this.getSdk()
      const promptOptions = await getPromptOptions(sdk, newValues.current)
      const metadata = await fetchSongMetadata(this.env.GENIUS_ACCESS_TOKEN, newValues.current)

      const sdxlPromptData = await inferPrompt(this.env.OPENAI_API_KEY, {
        ...promptOptions,
        ...metadata,
      })
      const modifiers =
        typeof sdxlPromptData.modifiers === 'string' ? sdxlPromptData.modifiers : Object.values(sdxlPromptData.modifiers).join(', ')
      const prompt = `${sdxlPromptData.prompt} modifiers: ${modifiers}`
      console.log(prompt)

      const falInput = {
        ...INPUT_DEFAULTS,
        prompt: prompt,
        seed: Number(randomSeed()),
      }
      console.log('sending to fal', falInput)
      this.falConnection.send(falInput)
    }
  }

  async onFalResult(result: any) {
    console.log('fal result', result)
    this.broadcast({ type: 'creation', images: result.images })
  }
}
