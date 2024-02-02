import { IRequest } from "itty-router"

export function handleOptions(request: IRequest, env: Env, ctx: ExecutionContext) {
  console.log(env)
  if (request.headers.get("Origin") !== null &&
      request.headers.get("Access-Control-Request-Method") !== null &&
      request.headers.get("Access-Control-Request-Headers") !== null) {
    // Handle CORS pre-flight request.
    return new Response(null, {
      headers: corsHeaders(env)
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

export function corsHeaders(env: Env) {
  return {
    "Access-Control-Allow-Origin": env.SYNESTHESAI_FRONTEND_URL,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  }
}
