import axios from 'axios'

const baseURL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

// Sanctum SPA menggunakan cookie sesi dan XSRF token, bukan bearer token.
export const api = axios.create({
  baseURL,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

export async function getCsrfCookie() {
  return axios.get(`${baseURL}/sanctum/csrf-cookie`, {
    withCredentials: true,
    withXSRFToken: true,
    headers: { Accept: 'application/json' },
  })
}

export async function getApiPing(config = {}) {
  const response = await api.get('/api/ping', config)
  return response.data
}

// Sesi yang tidak lagi valid dibersihkan oleh AuthContext.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const code = error.response?.data?.code
    const url = error.config?.url || ''
    const isLoginRequest = url.endsWith('/api/login')
    const isMeRequest = url.endsWith('/api/me')

    if ((status === 401 && !isLoginRequest && !isMeRequest) || (code === 'ACCOUNT_INACTIVE' && !isLoginRequest)) {
      window.dispatchEvent(new Event('auth:session-expired'))
    }

    return Promise.reject(error)
  },
)
