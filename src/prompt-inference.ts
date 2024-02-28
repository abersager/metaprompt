import OpenAI from 'openai'

export async function inferPrompt(openaiApiKey: string, promptOptions: PromptOptions): Promise<PromptData> {
  const openai = new OpenAI({ apiKey: openaiApiKey })

  console.log('prompt options:')
  console.log(promptOptions)

  const content = template(promptOptions)
  console.log('content:')
  console.log(content)

  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: 'user', content }],
    response_format: { type: 'json_object' },
    model: 'gpt-4-0125-preview',
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
