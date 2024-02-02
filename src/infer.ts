import { IRequest } from "itty-router";
import { getLyrics } from "./lyrics";
import { inferPrompt } from "./openai";
import { corsHeaders } from "./cors";
import { inferImage } from "./sdxl";
import { uploadImage } from "./images";

export async function infer(request: IRequest, env: Env, ctx: ExecutionContext) {
  if (request.headers.get("Content-Type") !== "application/json") {
    console.warn(request.query)
    console.warn(request.params)
    return Response.json({ error: "Content-Type must be application/json" }, { status: 400 })
  }

  const promptOptions: PromptOptions = await request.json()

  promptOptions.lyrics = await getLyrics(promptOptions.trackId)

  const sdxlPrompt = await inferPrompt(env.OPENAI_API_KEY, promptOptions)
  console.log(sdxlPrompt)

  const image = await inferImage(request, env, sdxlPrompt)
  return Response.json(image, {
    headers: corsHeaders(env)
  })
}
