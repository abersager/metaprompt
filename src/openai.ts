import OpenAI from 'openai'

export async function inferPrompt(openaiApiKey: string, promptOptions: PromptOptions) {
  const openai = new OpenAI({ apiKey: openaiApiKey })

  console.log('prompt options:')
  console.log(promptOptions)
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: template(promptOptions) }],
    response_format: {"type": "json_object"},
    model: 'gpt-4-0125-preview',
  })

  return JSON.parse(chatCompletion.choices[0].message.content || '{}')
}

function template(promptOptions: PromptOptions) {
  let lyricsString = ''
  if (promptOptions.lyrics) {
    lyricsString = promptOptions.lyrics.lines.map(x => x.words).join('\n')
  }

  return `
Create a prompt for the SDXL text-to-image generator with a maximum of 20 words.
The image resulting from the prompt should depict a typical listener's emotional response to "${promptOptions.trackName}" by ${promptOptions.artistName}.
Avoid the use instructive language.
Avoid title or artist name.
Avoid mentioning that this is about a song.
Avoid depicting a person.
Write only the prompt describing the image.
Write a set of modifiers for a prompt for the SDXL text-to-image generator, with a maximum of 20 words.
These modifiers should convey the notion of the musical genre '${promptOptions.artistGenres}'.
You may include (visual) art genre names, names of (visual) artists, colours and colour palettes, photography settings, composition, rendering engines, visual effects, drawing and painting techniques, etc.
Avoid including the name of the music gerne or music terms in general.

Respond in JSON format:
{
  "prompt": <prompt>,
  "modifiers": <modifiers>
}

Artist: ${promptOptions.artistName}
Title: ${promptOptions.trackName}
Genre: ${promptOptions.artistGenres}

${lyricsString}
`
}
