import { IRequest } from 'itty-router'
import Replicate from 'replicate'

const model = 'lucataco/sdxl-lcm:fbbd475b1084de80c47c35bfe4ae64b964294aa7e237e6537eed938cfd24903d'

export async function inferImage(request: IRequest, env: Env, promptData: PromptData) {
  const key = request.headers.get('cf-ray')
  if (!key) {
    throw new Error('Missing cf-ray header')
  }

  const modifiers = typeof promptData.modifiers === 'string' ? promptData.modifiers : Object.values(promptData.modifiers).join(', ')
  const prompt = `${promptData.prompt}\nmodifiers: ${modifiers}`
  console.log(prompt)

  const input = { prompt }

  const replicate = new Replicate({ auth: env.REPLICATE_API_TOKEN })

  return await replicate.run(model, { input })
}
