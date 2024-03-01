import { Track as SpotifyTrack } from '@spotify/web-api-ts-sdk'
import { IRequest } from 'itty-router'
import { CreationApi, getCreationApi } from './creation'

export class Track implements DurableObject {
  env: Env
  state: DurableObjectState
  storage: DurableObjectStorage
  creationApi: CreationApi

  constructor(state: DurableObjectState, env: Env) {
    this.env = env
    this.state = state
    this.storage = state.storage
    this.creationApi = getCreationApi(env)
  }

  async creations() {
    const creationIds = (await this.storage.get<string[]>('creations')) || []
    console.log('creationIds', this.state.id.toString(), creationIds)
    const creations = await Promise.all(
      creationIds.map(async (id: string) => {
        return await this.creationApi.get(id)
      }),
    )
    console.log('creations', creations)
    return creations
  }

  async fetch(request: IRequest) {
    let url = new URL(request.url)
    console.log('track fetch', request.method, url.pathname)
    if (request.method === 'PUT' && url.pathname === '/') {
      const spotifyTrack = await request.json()
      await this.storage.put('track', spotifyTrack)
      console.log('saved track', ((await this.storage.get('track')) as SpotifyTrack).id)
      return Response.json(spotifyTrack)
    } else if (request.method === 'GET' && url.pathname === '/') {
      const track = (await this.storage.get('track')) as SpotifyTrack
      console.log('getting track', this.state.id.toString(), track.id)
      return Response.json(track)
    } else if (request.method === 'GET' && url.pathname === '/creations') {
      console.log('here')
      return Response.json(await this.creations())
    } else if (request.method === 'POST' && url.pathname === '/creations') {
      const { image, trackId } = (await request.json()) as { image: FalImageData; trackId: string }
      const id = await this.creationApi.create(trackId, image)
      console.log('new creation', id)
      const creationIds = (await this.storage.get<string[]>('creations')) || []
      creationIds.push(id)
      await this.storage.put('creations', creationIds)
      console.log('saved creation', await this.storage.get('creations'))
      return new Response('OK')
    }

    return new Response('Bad request', { status: 400 })
  }
}

export interface TrackApi {
  get: (id: string) => Promise<SpotifyTrack>
  create: (spotifyTrack: SpotifyTrack) => Promise<SpotifyTrack>
  getCreations: (trackId: string) => Promise<CreationData[]>
  createCreation: (trackId: string, image: string) => Promise<CreationData>
}

export const getTrackApi = (env: Env): TrackApi => {
  const namespace = env.tracks.jurisdiction('eu')

  return {
    get: async (id: string) => {
      const trackObjectId = namespace.idFromName(id)
      console.log('getting track', id, trackObjectId.toString())
      const track = namespace.get(trackObjectId)
      const response = await track.fetch('http://track/')
      const json = await response.json()
      return json as unknown as SpotifyTrack
    },
    create: async (spotifyTrack: SpotifyTrack) => {
      const trackObjectId: DurableObjectId = namespace.idFromName(spotifyTrack.id)
      const track = namespace.get(trackObjectId)
      console.log('saving track', trackObjectId.toString(), spotifyTrack.id)
      return (await track.fetch('http://track/', {
        method: 'PUT',
        body: JSON.stringify(spotifyTrack),
      })) as unknown as SpotifyTrack
    },
    getCreations: async (trackId: string) => {
      console.log('getting creations', trackId)
      const track = namespace.get(namespace.idFromName(trackId))
      const response = await track.fetch('http://track/creations')
      console.log(JSON.stringify(response, null, 2))
      const json = await response.json()
      console.log(json)
      return json as unknown as CreationData[]
    },
    createCreation: async (trackId: string, image: string) => {
      const track = namespace.get(namespace.idFromName(trackId))
      return (await track.fetch('http://track/creations', {
        method: 'POST',
        body: JSON.stringify({ trackId, image }),
      })) as unknown as CreationData
    },
  }
}
