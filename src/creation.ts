import { IRequest } from 'itty-router'

function chunkSubstr(str: string, size: number): string[] {
  const numChunks = Math.ceil(str.length / size)
  const chunks = new Array(numChunks)

  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size)
  }

  return chunks
}

export class Creation implements DurableObject {
  state: DurableObjectState
  storage: DurableObjectStorage
  bucket: R2Bucket

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.storage = state.storage
    this.bucket = env.CREATIONS_BUCKET
  }

  async save(creationData: CreationData) {
    const chunks = chunkSubstr(JSON.stringify(creationData), 32 * 1024)
    await Promise.all(
      chunks.map(async (chunk, i) => {
        console.log('saving chunk', i)
        return await this.storage.put(`chunk-${i}`, chunk)
      }),
    )
    console.log('saved chunks')
    return Response.json({ id: creationData.id })
  }

  async read() {
    const chunksMap = await this.storage.list({ prefix: 'chunk-' })
    console.log(JSON.stringify(chunksMap, null, 2))
    const creation = Response.json(JSON.parse([...chunksMap.values()].join('')))
    console.log('read creation', JSON.stringify(creation, null, 2))
    return creation
  }

  async fetch(request: IRequest) {
    let url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/') {
      // Save creation information
      const creationData = (await request.json()) as CreationData
      console.log('saving creation', creationData)
      return await this.save(creationData)
    } else if (request.method === 'GET' && url.pathname === '/') {
      return await this.read()
    }

    return new Response('Bad request', { status: 400 })
  }
}

export interface CreationApi {
  get: (id: string) => Promise<CreationData>
  create: (trackId: string, image: FalImageData) => Promise<string>
}

export const getCreationApi = (env: Env): CreationApi => {
  const namespace = env.creations.jurisdiction('eu')

  return {
    get: async (id) => {
      const creation = namespace.get(namespace.idFromName(id))
      const response = await creation.fetch('http://creation/')
      const json = (await response.json()) as unknown as CreationData
      return json
    },
    create: async (trackId, image: FalImageData): Promise<string> => {
      console.log('creation for', trackId)
      const id = crypto.randomUUID()
      const creation = namespace.get(namespace.idFromName(id))

      const response = await creation.fetch('http://creation/', {
        method: 'POST',
        body: JSON.stringify({ id, frames: [{ image }], trackId }),
      })

      const json = (await response.json()) as any

      console.log('created', JSON.stringify(json, null, 2))

      return json.id
    },
  }
}
