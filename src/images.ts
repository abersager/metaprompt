import { IRequest } from "itty-router";

// Example: https://replicate.delivery/pbxt/fhNj8ibr5esC7E40gAxTcVBahJoAs1jgRO6oo4mUMHa2V9RSA/out-0.png
function parseReplicateImageUrl(urlString: string) {
  const url = new URL(urlString).pathname.match(/([a-zA-Z0-9]+)\/out/)
  if (!url) return null
  return url[1]
}

export async function uploadImage(request: IRequest, env: Env, ctx: ExecutionContext) {
  const auth = request.headers.get('Authorization');
  const expectedAuth = `Bearer ${env.AUTH_SECRET}`;

  if (!auth || auth !== expectedAuth) {
    return new Response('Unauthorized', { status: 401 });
  }

  let url = new URL(request.url)

  const imageURL = url.searchParams.get("image")
  if (!imageURL) return new Response('Missing "image" value', { status: 400 })

  try {
    // TODO: Customize validation logic
    const { hostname, pathname } = new URL(imageURL)

    // Optionally, only allow URLs with JPEG, PNG, GIF, or WebP file extensions
    // @see https://developers.cloudflare.com/images/url-format#supported-formats-and-limitations
    if (!/\.(jpe?g|png|gif|webp)$/i.test(pathname)) {
      return new Response('Disallowed file extension', { status: 400 })
    }

    if (hostname !== 'replicate.delivery') {
      return new Response('Must use "replicate.delivery" source images', { status: 403 })
    }
  } catch (err) {
    return new Response('Invalid "image" value', { status: 400 })
  }

  const imageRequest = new Request(imageURL, {
    headers: request.headers
  })

  const originalResponse = await fetch(imageRequest)

  console.log(originalResponse)

  const thumbnailJpegResponse = await fetch(imageRequest, {
    cf: {
      image: {
        format: 'jpeg',
        fit: "scale-down",
        width: 256,
      }
    }
  })

  console.log(thumbnailJpegResponse)

  const fullSizeJpegResponse = await fetch(imageRequest, {
    cf: {
      image: {
        format: 'jpeg'
      }
    }
  })

  const key = parseReplicateImageUrl(imageURL)

  await Promise.all([
    env.CREATIONS_BUCKET.put(`${key}-thumb.jpg`, thumbnailJpegResponse.body),
    env.CREATIONS_BUCKET.put(`${key}.jpg`, fullSizeJpegResponse.body),
    env.CREATIONS_BUCKET.put(`${key}.png`, originalResponse.body),
  ])

  return Response.json({
    thumbnail: `${key}-thumb.jpg`,
    fullsize: `${key}.jpg`,
    original: `${key}.png`,
  })
}

export async function getImage(key: string, _request: IRequest, env: any, _ctx: ExecutionContext) {
  const object = await env.CREATIONS_BUCKET.get(key);

  if (object === null) {
    return new Response('Object Not Found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);

  return new Response(object.body, {
    headers,
  });
};
