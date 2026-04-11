const configuredBase =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  ''

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  return trimmed.replace(/\/$/, '')
}

function fallbackBaseUrl(): string {
  return 'http://127.0.0.1:8000'
}

export function getApiBaseUrl(): string {
  const explicit = normalizeBaseUrl(configuredBase)
  if (explicit) {
    return explicit
  }

  return fallbackBaseUrl()
}
