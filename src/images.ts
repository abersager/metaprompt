import { IRequest } from "itty-router"

// import photon from '@silvia-odwyer/photon-node'

const maxAge = 60 * 60 * 24 * 30

// Example: https://fal-cdn.batuhan-941.workers.dev/files/koala/HEVbZvoQCYYK2JFHSbAhQ.jpeg
function getKeyFromFalImageUrl(urlString: string) {
  const url = urlString.match(/([a-zA-Z0-9_-]+)\.jpeg$/)
  if (!url) {
    return null
  }
  return url[1]
}

function getCacheKey(key: string): RequestInfo {
  return `https://images.synesthesai.com/image/${key}`
}

function cacheAndRespond(object: any, context: ExecutionContext, cache: Cache, key: string) {
  let [filename, format, extension] = key.split(/\/|\./)
  if (format === 'thumbnail') {
    filename += '-thumbnail'
  }

  const cacheKey = getCacheKey(key)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('Content-Type', object.httpMetadata?.contentType ?? '')
  headers.set('content-disposition', `attachment filename="${filename}.${extension}"`)
  // headers.set('Cache-Control', `public, max-age=${maxAge}`)
  headers.append('Cache-Control', `s-maxage=${maxAge}`);

  const response = new Response(object.body, {
    headers,
  })

  // Store the fetched response as cacheKey
  // Use waitUntil so you can return the response without blocking on
  // writing to cache
  console.log(`Caching response for: ${cacheKey}`)
  context.waitUntil(cache.put(cacheKey, response.clone()))

  return response
}

export async function uploadImage(request: IRequest, format: Format, env: Env, context: ExecutionContext, urlString: string){
  const auth = request.headers.get('Authorization')
  const expectedAuth = `Bearer ${env.AUTH_SECRET}`

  if (!auth || auth !== expectedAuth) {
    return new Response('Unauthorized', { status: 401 })
  }

  console.log(`Uploading image from ${urlString}`)
  const key = getKeyFromFalImageUrl(urlString)
  if (!key) {
    return new Response('Invalid URL', { status: 400 })
  }

  try {
    const upstreamResponse = await fetch(urlString)

    let payload: ReadableStream | Uint8Array | null = upstreamResponse.body
    let filename = 'original.jpeg'

    if (format === 'thumbnail') {
      const arrayBuffer = await upstreamResponse.arrayBuffer()
      const imageArray = new Uint8Array(arrayBuffer)
      const image = photon.PhotonImage.new_from_byteslice(imageArray)
      const thumbnail = photon.resize(image, 256, 256, photon.SamplingFilter.Lanczos3)
      payload = thumbnail.get_bytes_jpeg(80)
      filename = 'thumbnail.jpeg'
    }

    const object = await env.CREATIONS_BUCKET.put(`${key}/${filename}`, payload)

    cacheAndRespond(object, context, caches.default, `${key}/${filename}`)

    return Response.json({ key })
  } catch (e) {
    console.error(e)
    return new Response('Error', { status: 500 })
  }
}

export async function getImage(request: IRequest, env: any, context: ExecutionContext, key: string) {
  // Construct the cache key from the cache URL
  const cacheKey = getCacheKey(key)
  const cache = caches.default

  // Check whether the value is already available in the cache
  // if not, you will need to fetch it from R2, and store it in the cache
  // for future access
  let response = await cache.match(cacheKey)

  if (response) {
    console.log(`Cache hit for: ${request.url}.`)
    return response
  }

  console.log(
    `Response for request url: ${request.url} not present in cache. Fetching and caching request.`
  )

  const object = await env.CREATIONS_BUCKET.get(key)

  if (object === null) {
    return new Response('Object Not Found', { status: 404 })
  }

  return cacheAndRespond(object, context, cache, key)
}
