import { IRequest } from "itty-router"

export function handleOptions(request: IRequest, env: Env, ctx: ExecutionContext) {
  if (request.headers.get("Origin") !== null &&
    request.headers.get("Access-Control-Request-Method") !== null &&
    request.headers.get("Access-Control-Request-Headers") !== null) {
    // Handle CORS pre-flight request.
    return new Response(null, {
      headers: corsHeaders(request, env)
    })
  } else {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        "Allow": "GET, POST, OPTIONS",
      }
    })
  }
}

export function corsHeaders(request: IRequest, env: Env) {
  const frontendUrls = JSON.parse(env.SYNESTHESAI_FRONTEND_URLS)
  const origin = request.headers.get("Origin")

  const allowedOrigin = typeof origin === 'string' && frontendUrls.includes(origin) ? origin : 'null'
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  }
}
