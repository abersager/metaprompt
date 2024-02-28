import { IRequest, Router } from 'itty-router'

import { uploadImage, getImage } from './images'
export { User } from './users'
export { Track } from './track'
export { Creation } from './creation'
import { connect } from './users'
import { authorize, authorizeCallback } from './auth'

const router = Router()

router.get('/upload/:format/:url+', async (request: IRequest, env: Env, ctx) => {
  let url = decodeURIComponent(request.params.url)
  console.log(`Uploading ${url} as ${request.params.format}`)
  return await uploadImage(request, request.params.format as Format, env, ctx, url)
})

router.get('/image/:key+', async (request: IRequest, env: Env, ctx) => {
  let key = decodeURIComponent(request.params.key)
  console.log(`Getting image ${key}`)
  return await getImage(request, env, ctx, key)
})

router.get('/users/:userId', connect)

router.get('/authorize', authorize)

router.get('/authorize/callback', authorizeCallback)

router.all('*', () => new Response('Not found', { status: 404 }))

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return router.handle(request, env, ctx)
  },
}
