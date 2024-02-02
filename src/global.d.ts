interface Env {
  CREATIONS_BUCKET: R2Bucket
  OPENAI_API_KEY: string
  REPLICATE_API_TOKEN: string
  AUTH_SECRET: string
  SYNESTHESAI_FRONTEND_URLS: string
}

type LyricsLine = {
  startTimeMs: number
  words: string
}

type Lyrics = {
  syncType: 'LINE_SYNCED' | 'UNSYNCED'
  lines: LyricsLine[]
  language: string
  showUpsell: boolean
  capStatus: string
  impressionsRemaining: number
}

type PromptOptions = {
  trackId: string
  trackName: string
  artistName: string
  artistGenres: string
  lyrics?: Lyrics
}

type PromptData = {
  prompt: string
  modifiers: {
    [key: string]: string
  } | string
}

type ImageResponse = {
  key: string
  image: Uint8Array
}
