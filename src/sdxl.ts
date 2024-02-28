import { IRequest } from 'itty-router'
import * as fal from '@fal-ai/serverless-client'

export async function inferImage(request: IRequest, env: Env, promptData: PromptData): Promise<string[]> {
  const modifiers = typeof promptData.modifiers === 'string' ? promptData.modifiers : Object.values(promptData.modifiers).join(', ')
  const prompt = `${promptData.prompt}\nmodifiers: ${modifiers}`
  console.log(prompt)

  const input = { prompt }

  const replicate = new Replicate({ auth: env.REPLICATE_API_TOKEN })

  return (await replicate.run(model, { input })) as string[]
}
