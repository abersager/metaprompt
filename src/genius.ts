import axios from 'axios'
import * as htmlparser2 from 'htmlparser2'
import { getText } from 'domutils'
import Fuse from 'fuse.js'
import { Track } from '@spotify/web-api-ts-sdk'
import selectAll, { selectOne } from 'css-select'

export const fetchSongMetadata = async (accessToken: string, track: Track): Promise<Partial<PromptOptions>> => {
  const searchTerm = getGeniusSearchTerm(track)

  try {
    const response = await fetch(`https://api.genius.com/search?q=${searchTerm}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = (await response.json()) as any
    console.log(data)

    const hit = findBestGeniusHit(data.response.hits, track)

    if (hit) {
      const searchResult = hit
      const url = searchResult.url
      const id = searchResult.id

      const pageData = await scrapeGeniusPage(id, url)
      return { ...pageData, comments: await fetchSongComments(id) }
    } else {
      console.warn(`Song not found on Genius: ${track.name}. Search term was ${searchTerm}`)
      return {}
    }
  } catch (error) {
    console.warn(`Failed to fetch song metadata from Genius: ${error}`)
    return {}
  }
}

export const getGeniusSearchTerm = (track: Track) => {
  return encodeURIComponent(`${track.artists[0].name} ${track.name}`.replace(/ - .*$/, '').replace(/&|remastered/i, ''))
}

export const findBestGeniusHit = (hits: any[], track: Track) => {
  const fuse = new Fuse(hits, {
    includeScore: true,
    keys: ['result.title', 'result.primary_artist.name'],
  })
  const result = fuse.search(`${track.artists[0].name} ${track.name}`)
  return result.length ? hits[result[0].refIndex].result : null
}

const scrapeGeniusPage = async (id: number, url: string): Promise<Partial<PromptOptions>> => {
  console.info(`Scraping Genius page for song with id ${id}, url: ${url}`)

  try {
    const response = await fetch(url)
    const data = await response.text()
    const dom = htmlparser2.parseDocument(data)
    const lyricsEl = selectOne('[data-lyrics-container]', dom.children)
    const lyrics = lyricsEl ? getText(lyricsEl) : undefined

    const artistCommentEl = selectOne('blockquote', dom.children)
    const artistComment = artistCommentEl ? getText(artistCommentEl) : undefined

    return { lyrics, artistComment }
  } catch (error) {
    console.warn(`Failed to fetch data from Genius: ${error}`)
    return {}
  }
}

const fetchSongComments = async (id: number): Promise<string[] | undefined> => {
  try {
    const response = await fetch(`https://genius.com/api/songs/${id}/comments?page=1&per_page=50&text_format=markdown`)
    const data = (await response.json()) as any
    return data.response.comments.map((comment: any) => comment.body.markdown as string)
  } catch (error) {
    console.warn(`Failed to fetch comments for song with id ${id}: ${error}`)
  }
}
