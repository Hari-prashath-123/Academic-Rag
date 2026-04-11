import api from './api'
import { setAuthTokens } from './auth-storage'

export type AuthTokenPair = {
  access_token: string
  refresh_token?: string
  token_type?: string
}

export type AuthUser = {
  id: string
  email: string
  profile: {
    first_name?: string | null
    last_name?: string | null
    avatar_url?: string | null
    phone?: string | null
  }
  roles: string[]
  permissions: string[]
}

export async function loginWithCredentials(email: string, password: string): Promise<AuthTokenPair> {
  const response = await api.post('/api/accounts/token/', { email, password })
  const tokens = response.data as AuthTokenPair

  if (!tokens.access_token) {
    throw new Error('Login token not returned by API')
  }

  setAuthTokens(tokens.access_token, tokens.refresh_token)
  return tokens
}

export async function getMe(): Promise<AuthUser> {
  const response = await api.get('/api/accounts/me/')
  return response.data as AuthUser
}
