import axios from 'axios'

// Public requests never restore authentication state or redirect on 401/403.
export const publicApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { Accept: 'application/json' },
  withCredentials: false,
  timeout: 15_000,
})
