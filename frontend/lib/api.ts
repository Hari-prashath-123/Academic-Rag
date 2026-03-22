import axios, { AxiosRequestConfig, AxiosError } from 'axios'

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
const baseURL = configuredApiUrl.replace(/\/$/, '')

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach token from localStorage if present
api.interceptors.request.use((config: AxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      (config.headers as any).Authorization = `Bearer ${token}`
    }
  }
  return config
}, (error: AxiosError) => Promise.reject(error))

// Response interceptor: on 401 redirect to login
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
