import * as fal from '@fal-ai/serverless-client'

export const defaultNegativePrompt =
  'worst quality, normal quality, low quality, low res, blurry, text, watermark, logo, banner, extra digits, cropped, jpeg artifacts, signature, username, error, duplicate, ugly, mutation, disgusting, bad anatomy, bad hands, three hands, three legs, bad arms, missing legs, missing arms, poorly drawn face, bad face, fused face, cloned face, worst face, three crus, extra crus, fused crus, worst feet, three feet, fused feet, fused thigh, three thigh, fused thigh, extra thigh, worst thigh, missing fingers, extra fingers, ugly fingers, long fingers, horn, extra eyes, huge eyes, 2girl, amputation, disconnected limbs, cartoon, cg, 3d, unreal, animate'

function randomSeed() {
  return Math.floor(Math.random() * 10000000).toFixed(0)
}

const falDefaults = {
  _force_msgpack: new Uint8Array([]),
  enable_safety_checker: false,
  image_size: 'square_hd',
  sync_mode: true,
  num_images: 1,
  num_inference_steps: '4',
}

export const inferImage = async (promptData: PromptData): Promise<any> => {
  const modifiers = typeof promptData.modifiers === 'string' ? promptData.modifiers : Object.values(promptData.modifiers).join(', ')
  const prompt = `${promptData.prompt} ${modifiers}`
  console.log(prompt)

  const falInput = {
    ...falDefaults,
    prompt: prompt,
    negative_prompt: defaultNegativePrompt,
    seed: Number(randomSeed()),
    num_inference_steps: 40,
  }
  console.log('sending to fal', falInput)

  return await fal.subscribe('fal-ai/fast-sdxl', { input: falInput })
}
