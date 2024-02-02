import { IRequest } from "itty-router";

// Example: https://replicate.delivery/pbxt/fhNj8ibr5esC7E40gAxTcVBahJoAs1jgRO6oo4mUMHa2V9RSA/out-0.png
function parseReplicateImageUrl(urlString: string) {
  const url = new URL(urlString).pathname.match(/([a-zA-Z0-9]+)\/out/)
  if (!url) return null
  return url[1]
}

export async function uploadImage(env: Env, key: string, image: any) {
  const response = await env.CREATIONS_BUCKET.put(key, image)

  if (!response) {
    return new Response('Failed to upload image', { status: 500 })
  }

  return Response.json({
    original: response.key,
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
