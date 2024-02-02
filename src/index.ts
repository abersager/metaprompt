import { IRequest, Router } from 'itty-router'

import { uploadImage, getImage } from './images'
import { handleOptions } from './options'

const router = Router()

// router.post("/image", uploadImage)
router.options('*', handleOptions)

router.get("/image/:key", async (request: IRequest, env: Env, ctx) => {
  // Decode text like "Hello%20world" into "Hello world"
  let key = decodeURIComponent(request.params.key)
  return await getImage(key, request, env, ctx)
})


router.all('*', () => new Response('404, Not found', { status: 404 }))

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return router.handle(request, env, ctx)
  }
};
