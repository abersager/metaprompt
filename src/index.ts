import { IRequest, Router } from 'itty-router'

import { uploadImage, getImage } from './images'

const router = Router()

router.get('/convert/:url+', async (request: IRequest, env: Env, ctx) => {
  let url = decodeURIComponent(request.params.url)
  return await uploadImage(request, env, ctx, url)
})

router.get('/image/:key', async (request: IRequest, env: Env, ctx) => {
  let key = decodeURIComponent(request.params.key)
  return await getImage(request, env, ctx, key)
})


router.all('*', () => new Response('404, Not found', { status: 404 }))

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return router.handle(request, env, ctx)
  }
};
