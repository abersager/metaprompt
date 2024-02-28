import { SpotifyApi, Track } from '@spotify/web-api-ts-sdk'

type CurrentAndNext = {
  current?: Track
  next?: Track
}

export async function currentlyPlaying(sdk: SpotifyApi): Promise<CurrentAndNext> {
  const { currently_playing, queue } = await sdk.player.getUsersQueue()

  return {
    current: currently_playing && currently_playing.type === 'track' ? (currently_playing as Track) : undefined,
    next: queue.length && queue[0].type === 'track' ? (queue[0] as Track) : undefined,
  }
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
