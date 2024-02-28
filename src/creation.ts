import { IRequest } from 'itty-router'

export class Creation implements DurableObject {
  state: DurableObjectState
  storage: DurableObjectStorage

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.storage = state.storage
  }

  async fetch(request: IRequest) {
    if (request.method === 'POST' && request.route === '/') {
      // Save creation information
      const creationData = await request.json()
      await this.storage.put('creation', creationData)
      return new Response('OK')
    } else if (request.method === 'GET' && request.route === '/') {
      return Response.json(await this.storage.get('creation'))
    }

    return new Response('Bad request', { status: 400 })
  }
}

export const getOrCreateCreation = async (creations: DurableObjectNamespace, creationData: CreationData) => {
  const creation = creations.get(creations.idFromName(creationData.key))
  await creation.fetch('http://internal/', { method: 'POST', body: JSON.stringify(creationData) })
  return creation
}

export const getCreation = async (creations: DurableObjectNamespace, key: string) => {
  const creation = creations.get(creations.idFromName(key))
  return await creation.fetch('http://internal/')
}
