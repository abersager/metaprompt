import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { IRequest } from 'itty-router'
import queryString from 'query-string'

const scopes = ['user-read-currently-playing', 'user-read-playback-state']

export async function authorize(request: IRequest, env: Env) {
  // Redirect to another URL
  return Response.redirect(
    `https://accounts.spotify.com/authorize?client_id=${env.SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
      `${env.SYNESTHESAI_WORKER_URL}/authorize/callback`,
    )}&scope=${scopes.join('%20')}`,
    302,
  )
}

export async function authorizeCallback(request: IRequest, env: Env) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const authOptions = {
    method: 'POST',
    body: queryString.stringify({
      code: code,
      redirect_uri: `${env.SYNESTHESAI_WORKER_URL}/authorize/callback`,
      grant_type: 'authorization_code',
    }),
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`),
    },
  }

  const response = await fetch('https://accounts.spotify.com/api/token', authOptions)
  const authInfo = (await response.json()) as AuthInfo

  const sdk: SpotifyApi = SpotifyApi.withAccessToken(env.SPOTIFY_CLIENT_ID, authInfo)
  const profile = await sdk.currentUser.profile()

  const userObjectId = env.users.idFromName(profile.id)
  console.log('login', userObjectId)
  const user = env.users.get(userObjectId)

  await user.fetch(new Request('http://internal/login', { method: 'POST', body: JSON.stringify(authInfo) }))

  return Response.redirect(`http://localhost:5173?user-id=${userObjectId}`, 302)
}
