import { SpotifyApi, Track } from '@spotify/web-api-ts-sdk'

type CurrentAndNext = {
  current?: Track
  next?: Track
}

export async function currentlyPlaying(sdk: SpotifyApi): Promise<CurrentAndNext> {
  const { currently_playing, queue } = await sdk.player.getUsersQueue()

  let current: Track | undefined
  if (currently_playing && currently_playing.type === 'track' && hasChanged(currently_playing as Track, current)) {
    current = currently_playing as Track
  }

  let next: Track | undefined
  if (queue.length && queue[0].type === 'track') {
    next = queue[0] as Track
  }

  return { current, next }
}

export function hasChanged(previous: Track | undefined, now: Track | undefined) {
  if (!previous && !now) return false
  if (!previous || !now) return true
  return previous.id !== now.id
}

export async function getPromptOptions(sdk: SpotifyApi, track: Track): Promise<PromptOptions> {
  return {
    trackId: track.id,
    trackName: track.name,
    artistName: track.artists[0].name,
    artistGenres: (await sdk.artists.get(track.artists[0].id)).genres.join(', '),
  }
}
