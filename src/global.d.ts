interface Env {
  CREATIONS_BUCKET: R2Bucket
  OPENAI_API_KEY: string
  REPLICATE_API_TOKEN: string
  AUTH_SECRET: string
  SYNESTHESAI_FRONTEND_URLS: string
  FAL_KEY: string
  SPOTIFY_CLIENT_ID: string
  SPOTIFY_CLIENT_SECRET: string
  SYNESTHESAI_WORKER_URL: string
  GENIUS_ACCESS_TOKEN: string
  GROQ_API_KEY: string
  users: DurableObjectNamespace
  tracks: DurableObjectNamespace
  creations: DurableObjectNamespace
}

type Format = 'original' | 'thumbnail'

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
  lyrics?: string
  artistComment?: string
  comments?: string[]
}

type PromptData = {
  prompt: string
  modifiers:
    | {
        [key: string]: string
      }
    | string
  explanation: string
}

type CreationData = {
  key: string
  image: Uint8Array
}
