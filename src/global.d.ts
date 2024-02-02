interface Env {
  CREATIONS_BUCKET: R2Bucket
  OPENAI_API_KEY: string
  AUTH_SECRET: string
  SYNESTHESAI_FRONTEND_URL: string
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
