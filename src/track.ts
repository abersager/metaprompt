import { Track as SpotifyTrack } from '@spotify/web-api-ts-sdk'
import { IRequest } from 'itty-router'
import { getCreation } from './creation'

export class Track implements DurableObject {
  env: Env
  state: DurableObjectState
  storage: DurableObjectStorage

  constructor(state: DurableObjectState, env: Env) {
    this.env = env
    this.state = state
    this.storage = state.storage
  }

  async creations() {
    const creationKeys = (await this.storage.get<string[]>('creations')) || []
    return Promise.all(
      creationKeys.map((key: string) => {
        getCreation(this.env.creations, key)
      }),
    )
  }

  async fetch(request: IRequest) {
    let url = new URL(request.url)
    if (request.method === 'PUT' && url.pathname === '/') {
      // Save Spotify track information
      const spotifyTrack = await request.json()
      await this.storage.put('track', spotifyTrack)
      return Response.json(spotifyTrack)
    } else if (request.method === 'GET' && request.route === '/') {
      return Response.json(await this.storage.get('track'))
    } else if (request.method === 'GET' && request.route === '/creations') {
      return Response.json(await this.creations())
    } else if (request.method === 'POST' && request.route === '/creations') {
      const creation = this.env.creations.get(this.env.creations.idFromString(''))
      return Response.json(await creation.fetch('/', { method: 'POST', body: await request.json() }))
    }

    return new Response('Bad request', { status: 400 })
  }
}

export const getOrCreateTrack = async (tracks: DurableObjectNamespace, spotifyTrack: SpotifyTrack) => {
  const track = tracks.get(tracks.idFromName(spotifyTrack.id))
  return await track.fetch('http://internal/', { method: 'PUT', body: JSON.stringify(spotifyTrack) })
}

export const getTrack = async (tracks: DurableObjectNamespace, id: string) => {
  const track = tracks.get(tracks.idFromName(id))
  return await track.fetch('http://internal/')
}
