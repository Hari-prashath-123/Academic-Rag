import axios, { AxiosRequestConfig, AxiosError } from 'axios'

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
