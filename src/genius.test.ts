import { describe, it, expect } from 'vitest'
import { getGeniusSearchTerm, findBestGeniusHit } from './genius' // Adjust the import path as needed

const artists = [{ name: 'The Beatles' }, { name: 'Paul McCartney' }, { name: 'Pulp' }, { name: 'Tommy Guerrero' }]

const tracks = [
  { name: 'The& End', artists: [artists[0], artists[1]] },
  { name: 'This Is Hardcore - Original Version', artists: [artists[2]] },
  { name: 'White Sands', artists: [artists[3]] },
]

describe('getGeniusSearchTerm', () => {
  it('returns a sanitized search string', () => {
    expect(getGeniusSearchTerm(tracks[0])).toBe('The%20Beatles%20The%20End')
    expect(getGeniusSearchTerm(tracks[1])).toBe('Pulp%20This%20Is%20Hardcore')
  })
})

describe('findBestGeniusHit', () => {
  const hits = [
    {
      result: {
        id: 1,
        primary_artist: { name: 'Rap Genius' },
        title: 'Athlete References in Rap Music',
      },
    },
    {
      result: {
        id: 2,
        primary_artist: { name: 'Tommy Guerrero foo' },
        title: 'White Sands',
      },
    },
    {
      result: {
        id: 3,
        primary_artist: { name: 'Genius France' },
        title: 'Singles rap - 2020',
      },
    },
  ]

  it('finds the best hit, taking into account artist mismatches', () => {
    const bestHit = findBestGeniusHit(hits, tracks[2])
    expect(bestHit).toEqual(hits[1].result)
  })

  it('finds the best hit, taking into account track title mismatches', () => {
    hits[1].result.title = 'foo White Sands' // Adjusting title for mismatch scenario
    const bestHit = findBestGeniusHit(hits, tracks[2])
    expect(bestHit).toEqual(hits[1].result)
  })

  it('needs to cross a similarity threshold', () => {
    const unsuitableHits = [
      {
        result: {
          id: 1,
          primary_artist: { name: 'Rap Genius' },
          title: 'Athlete References in Rap Music',
        },
      },
      {
        result: {
          id: 2,
          primary_artist: { name: 'Swono' },
          title: 'Album History',
        },
      },
      {
        result: {
          id: 3,
          primary_artist: { name: 'JKGenius75' },
          title: 'Pro Wrestling Nicknames',
        },
      },
      {
        result: {
          id: 4,
          primary_artist: { name: 'Genius France' },
          title: 'Singles rap - 2022',
        },
      },
      {
        result: {
          id: 5,
          primary_artist: { name: 'Grünt' },
          title: 'Grünt #62',
        },
      },
      {
        result: {
          id: 6,
          primary_artist: { name: 'Genius France' },
          title: 'Singles rap - 2020',
        },
      },
    ]
    const bestHit = findBestGeniusHit(unsuitableHits, tracks[2])
    expect(bestHit).toBeNull()
  })
})
