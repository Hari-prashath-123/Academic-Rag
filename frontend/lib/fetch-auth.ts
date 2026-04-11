import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from './auth-storage'
import { getApiBaseUrl } from './api-base'

type FetchWithAuthOptions = RequestInit & {
  skipAuthRetry?: boolean
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) {
    return null
  }

  const response = await fetch(`${getApiBaseUrl()}/api/accounts/token/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh }),
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as {
    access_token?: string
    refresh_token?: string
  }

  if (!payload.access_token) {
    return null
  }

  setAuthTokens(payload.access_token, payload.refresh_token)
  return payload.access_token
}

export async function fetchWithAuth(input: string, options: FetchWithAuthOptions = {}): Promise<Response> {
  const { skipAuthRetry, ...requestOptions } = options
  const headers = new Headers(options.headers || {})
  const accessToken = getAccessToken()

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${getApiBaseUrl()}${input}`, {
    ...requestOptions,
    headers,
  })

  if (response.status !== 401 || skipAuthRetry) {
    return response
  }

  const refreshedAccessToken = await refreshAccessToken()
  if (!refreshedAccessToken) {
    clearAuthTokens()
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    return response
  }

  headers.set('Authorization', `Bearer ${refreshedAccessToken}`)
  return fetch(`${getApiBaseUrl()}${input}`, {
    ...requestOptions,
    headers,
  })
}
