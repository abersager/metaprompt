import { AccessToken, IAuthStrategy, SdkConfiguration, SpotifyApi } from '@spotify/web-api-ts-sdk'
import { IRequest } from 'itty-router'
import queryString from 'query-string'
import { getUserApi } from './users'

const scopes = ['user-read-currently-playing', 'user-read-playback-state']

export async function authorize(request: IRequest, env: Env) {
  // Redirect to another URL
  return Response.redirect(
    `https://accounts.spotify.com/authorize?client_id=${
      env.SPOTIFY_CLIENT_ID
    }&response_type=code&redirect_uri=${encodeURIComponent(
      `${env.SYNESTHESAI_WORKER_URL}/authorize/callback`,
    )}&scope=${scopes.join('%20')}`,
    302,
  )
}

export async function authorizeCallback(request: IRequest, env: Env) {
  const userApi = getUserApi(env)

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
  const authInfo = (await response.json()) as AccessToken

  const sdk: SpotifyApi = getSpotifyApi(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET, authInfo)
  const profile = await sdk.currentUser.profile()

  const userObjectId = await userApi.login(profile.id, authInfo)

  return Response.redirect(`${env.SYNESTHESAI_FRONTEND_URL}?user-id=${userObjectId}`, 302)
}

// Token refresh seems to be broken in @spotify/web-api-ts-sdk. The Authorization header seems to be necessary
// for the refresh token request to work. Providing custom refresh token action that includes the Authorization
// header.
export function getSpotifyApi(clientId: string, clientSecret: string, authInfo: AccessToken) {
  const refreshTokenAction = async (_clientId: string, _authInfo: AccessToken) => {
    const authOptions = {
      method: 'POST',
      body: queryString.stringify({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: authInfo.refresh_token,
      }),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`),
      },
    }

    const response = await fetch('https://accounts.spotify.com/api/token', authOptions)
    return (await response.json()) as AccessToken
  }
  const strategy = new ProvidedAccessTokenStrategy(clientId, authInfo, refreshTokenAction)
  return new SpotifyApi(strategy)
}

class ProvidedAccessTokenStrategy implements IAuthStrategy {
  private refreshTokenAction: (clientId: string, token: AccessToken) => Promise<AccessToken>

  constructor(
    protected clientId: string,
    protected accessToken: AccessToken,
    refreshTokenAction: (clientId: string, token: AccessToken) => Promise<AccessToken>,
  ) {
    this.refreshTokenAction = refreshTokenAction

    // If the raw token from the jwt response is provided here
    // Calculate an absolute `expiry` value.
    // Caveat: If this token isn't fresh, this value will be off.
    // It's the responsibility of the calling code to either set a valid
    // expires property, or ensure expires_in accounts for any lag between
    // issuing and passing here.

    if (!this.accessToken.expires) {
      this.accessToken.expires = this.calculateExpiry(this.accessToken)
    }
  }

  public setConfiguration(_: SdkConfiguration): void {}

  public async getOrCreateAccessToken(): Promise<AccessToken> {
    if (this.accessToken.expires && this.accessToken.expires <= Date.now()) {
      const refreshed = await this.refreshTokenAction(this.clientId, this.accessToken)
      this.accessToken = refreshed
    }

    return this.accessToken
  }

  public async getAccessToken(): Promise<AccessToken | null> {
    return this.accessToken
  }

  public removeAccessToken(): void {
    this.accessToken = {
      access_token: '',
      token_type: '',
      expires_in: 0,
      refresh_token: '',
      expires: 0,
    }
  }

  calculateExpiry(item: AccessToken) {
    return Date.now() + item.expires_in * 1000
  }
}
