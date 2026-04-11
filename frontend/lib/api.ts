import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { getApiBaseUrl } from './api-base'
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from './auth-storage'

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

async function attemptRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return null
  }

  try {
    const response = await axios.post(`${getApiBaseUrl()}/api/accounts/token/refresh/`, {
      refresh: refreshToken,
    })

    const payload = response.data as {
      access_token?: string
      refresh_token?: string
    }

    if (!payload.access_token) {
      return null
    }

    setAuthTokens(payload.access_token, payload.refresh_token)
    return payload.access_token
  } catch {
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      return attemptRefreshToken().then((newAccessToken) => {
        if (newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return api(originalRequest)
        }

        clearAuthTokens()
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        return Promise.reject(error)
      })
    }

    if (error.response?.status === 401) {
      clearAuthTokens()
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
