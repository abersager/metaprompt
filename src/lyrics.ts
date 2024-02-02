export async function getLyrics(trackId: string): Promise<Lyrics> {
  console.log(`Retrieving lyrics for ${trackId}`)
  const res = await fetch(`https://api.lyricstify.vercel.app/v1/lyrics/${trackId}`)

  const data: { lyrics: Lyrics } = await res.json()
  console.log(data)
  return data.lyrics as Lyrics
}
