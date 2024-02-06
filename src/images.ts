import { IRequest } from "itty-router";

import photon from '@silvia-odwyer/photon-node';

// Example: https://fal-cdn.batuhan-941.workers.dev/files/koala/HEVbZvoQCYYK2JFHSbAhQ.jpeg
function getKeyFromFalImageUrl(urlString: string) {
  const url = urlString.match(/([a-zA-Z0-9]+)\.jpeg$/)
  if (!url) {
    return null
  }
  return url[1]
}

export async function uploadImage(request: IRequest, format: Format, env: Env, _ctx: ExecutionContext, urlString: string){
  const auth = request.headers.get('Authorization');
  const expectedAuth = `Bearer ${env.AUTH_SECRET}`;

  if (!auth || auth !== expectedAuth) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log(`Uploading image from ${urlString}`)
  const key = getKeyFromFalImageUrl(urlString)
  if (!key) {
    return new Response('Invalid URL', { status: 400 });
  }

  try {
    const response = await fetch(urlString);

    let payload: ReadableStream | Uint8Array | null = response.body
    let filename = 'original.jpeg'

    if (format === 'thumbnail') {
      const arrayBuffer = await response.arrayBuffer();
      const imageArray = new Uint8Array(arrayBuffer);
      const image = photon.PhotonImage.new_from_byteslice(imageArray)
      const thumbnail = photon.resize(image, 256, 256, photon.SamplingFilter.Lanczos3)
      payload = thumbnail.get_bytes_jpeg(80);
      filename = 'thumbnail.jpeg'
    }

    await env.CREATIONS_BUCKET.put(`${key}/${filename}`, payload)

    return Response.json({ key })
  } catch (e) {
    console.error(e)
    return new Response('Error', { status: 500 })
  }
}

export async function getImage(_request: IRequest, env: any, _ctx: ExecutionContext, key: string) {
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
