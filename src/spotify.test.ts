import { vi, describe, expect, it } from 'vitest'
import { SpotifyApi, Track } from '@spotify/web-api-ts-sdk'
import { currentlyPlaying, hasChanged } from './spotify'

describe('currently-playing', () => {
  it('returns current and next track when playing', async () => {
    const mockSdk = {
      player: {
        getUsersQueue: vi.fn().mockResolvedValue({
          currently_playing: {
            type: 'track',
            name: 'Current Track',
          },
          queue: [
            {
              type: 'track',
              name: 'Next Track',
            },
          ],
        }),
      },
    } as unknown as SpotifyApi

    expect(await currentlyPlaying(mockSdk)).toEqual({
      current: {
        type: 'track',
        name: 'Current Track',
      },
      next: {
        type: 'track',
        name: 'Next Track',
      },
    })
  })

  it('ignores non-track items', async () => {
    const mockSdk = {
      player: {
        getUsersQueue: vi.fn().mockResolvedValue({
          currently_playing: {
            type: 'episode',
            name: 'Current Episode',
          },
          queue: [
            {
              type: 'track',
              name: 'Next Track',
            },
          ],
        }),
      },
    } as unknown as SpotifyApi

    expect(await currentlyPlaying(mockSdk)).toEqual({
      current: undefined,
      next: {
        type: 'track',
        name: 'Next Track',
      },
    })
  })

  it('returns undefined when nothing is playing', async () => {
    const mockSdk = {
      player: {
        getUsersQueue: vi.fn().mockResolvedValue({
          currently_playing: undefined,
          queue: [],
        }),
      },
    } as unknown as SpotifyApi

    expect(await currentlyPlaying(mockSdk)).toEqual({
      current: undefined,
      next: undefined,
    })
  })
})

describe('hasChanged', () => {
  const getTrack = (id: string): Track => {
    return { type: 'track', id } as Track
  }

  it('returns true when the track has changed', () => {
    expect(hasChanged(getTrack('1'), getTrack('2'))).toBe(true)
  })

  it('returns false when the track has not changed', () => {
    expect(hasChanged(getTrack('1'), getTrack('1'))).toBe(false)
  })

  it('returns true when the previous track is undefined', () => {
    expect(hasChanged(undefined, getTrack('2'))).toBe(true)
  })

  it('returns true when the current track is undefined', () => {
    expect(hasChanged(getTrack('1'), undefined)).toBe(true)
  })
})
