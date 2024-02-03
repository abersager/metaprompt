import { IRequest } from "itty-router";

import photon from '@silvia-odwyer/photon-node';

// Example: https://replicate.delivery/pbxt/fhNj8ibr5esC7E40gAxTcVBahJoAs1jgRO6oo4mUMHa2V9RSA/out-0.png
function parseReplicateImageUrl(urlString: string) {
  const url = urlString.match(/replicate\.delivery\/pbxt\/([a-zA-Z0-9]+)\/out/)
  if (!url) {
    return null
  }
  return url[1]
}

export async function uploadImage(request: IRequest, env: Env, _ctx: ExecutionContext, urlString: string){
  const auth = request.headers.get('Authorization');
  const expectedAuth = `Bearer ${env.AUTH_SECRET}`;

  if (!auth || auth !== expectedAuth) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log(`Uploading image from ${urlString}`)
  const key = parseReplicateImageUrl(urlString)
  if (!key) {
    return new Response('Invalid URL', { status: 400 });
  }

  const response = await fetch(urlString);
  const arrayBuffer = await response.arrayBuffer();
  const imageArray = new Uint8Array(arrayBuffer);
  const image = photon.PhotonImage.new_from_byteslice(imageArray)

  const jpeg = image.get_bytes_jpeg(90);
  const thumbnail = photon.resize(image, 256, 256, photon.SamplingFilter.Lanczos3)
  const thumbnailJpeg = thumbnail.get_bytes_jpeg(80);

  const responses = await Promise.all([
    await env.CREATIONS_BUCKET.put(`${key}.png`, imageArray),
    await env.CREATIONS_BUCKET.put(`${key}.jpg`, jpeg),
    await env.CREATIONS_BUCKET.put(`${key}_thumb.jpg`, thumbnailJpeg),
  ])

  return {
    key,
    original: `${key}.png`,
    fullsize: `${key}.jpg`,
    thumbnail: `${key}_thumb.jpg`,
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
