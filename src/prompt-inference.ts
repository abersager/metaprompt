import OpenAI from 'openai'
import Groq from 'groq-sdk'

const inferenceEngines = {
  'gpt-4-0125-preview': 'openai',
  'mixtral-8x7b-32768': 'groq',
}

const model = 'mixtral-8x7b-32768'

export async function inferPrompt(env: Env, promptOptions: PromptOptions): Promise<PromptData> {
  console.log('prompt options:')
  console.log(promptOptions)

  const content = template(promptOptions)
  console.log('content:')
  console.log(content)

  const inferenceEngine = inferenceEngines[model]
  if (inferenceEngine === 'openai') {
    return inferPromptOpenAI(env.OPENAI_API_KEY, model, content)
  } else if (inferenceEngine === 'groq') {
    return inferPromptGroq(env.GROQ_API_KEY, model, content)
  } else {
    throw new Error(`Inference engine not found for model ${model}`)
  }
}

async function inferPromptOpenAI(apiKey: string, model: string, content: string): Promise<PromptData> {
  const openai = new OpenAI({ apiKey })

  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: 'user', content }],
    response_format: { type: 'json_object' },
    model,
  })

  return JSON.parse(chatCompletion.choices[0].message.content || '{}')
}

async function inferPromptGroq(apiKey: string, model: string, content: string): Promise<PromptData> {
  const groq = new Groq({ apiKey })

  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: 'user', content }],
    model,
  })

  return JSON.parse(chatCompletion.choices[0].message.content || '{}')
}

function template(promptOptions: PromptOptions) {
  return `
Create a prompt for the SDXL text-to-image generator with a maximum of 30 words.
The image resulting from the prompt should depict a typical listener's emotional response to "${promptOptions.trackName}" by ${
    promptOptions.artistName
  }.
Avoid instructive language.
Avoid title or artist name.
Avoid mentioning that this is about a song.
Avoid including the name of the music gerne or music terms in general.
Avoid depicting the listener.
Write a set of modifiers for a prompt for the SDXL text-to-image generator, with a maximum of 20 words, which should convey the notion of the musical genre '#{prompt_options.artist_genres}'.
You may include (visual) art genre names, names of (visual) artists, colours and colour palettes, photography settings, composition, rendering engines, visual effects, drawing and painting techniques, etc.
Include an explanation, with a maximum of 30 words, which should explain the reasoning behind the prompt but not the modifiers.

Artist: ${promptOptions.artistName}
Title: ${promptOptions.trackName}
Genre: ${promptOptions.artistGenres}

${lyricsString(promptOptions)}

${artistCommentString(promptOptions)}

Respond in JSON format:
{
  "prompt": <prompt>,
  "modifiers": <modifiers>,
  "explanation": <explanation>
}
`
}

function lyricsString(promptOptions: PromptOptions) {
  if (promptOptions.lyrics) {
    return `Lyrics:\n${promptOptions.lyrics}`
  }
  return ''
}

function artistCommentString(promptOptions: PromptOptions) {
  if (promptOptions.artistComment) {
    return `Comment by the artist about the song:\n${promptOptions.artistComment}`
  }
  return ''
}
