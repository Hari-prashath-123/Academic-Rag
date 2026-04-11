const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const LEGACY_ACCESS_TOKEN_KEY = 'token'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function writeAuthCookie(accessToken: string | null): void {
  if (!isBrowser()) {
    return
  }

  if (!accessToken) {
    document.cookie = 'token=; Path=/; Max-Age=0; SameSite=Lax'
    return
  }

  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `token=${accessToken}; Path=/; Max-Age=604800; SameSite=Lax${secureFlag}`
}

export function getAccessToken(): string | null {
  if (!isBrowser()) {
    return null
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) {
    return null
  }

  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setAuthTokens(accessToken: string, refreshToken?: string | null): void {
  if (!isBrowser()) {
    return
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(LEGACY_ACCESS_TOKEN_KEY, accessToken)

  if (typeof refreshToken === 'string' && refreshToken.length > 0) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }

  writeAuthCookie(accessToken)
}

export function clearAuthTokens(): void {
  if (!isBrowser()) {
    return
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY)
  writeAuthCookie(null)
}
