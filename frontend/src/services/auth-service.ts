import api from './api'

const TOKEN_KEY = 'sambidhan_token'

export interface User {
  id: string
  email: string
  name: string | null
  createdAt: string
}

interface AuthResponse {
  token: string
  user: User
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export async function register(email: string, password: string, name?: string) {
  const response = await api.post<AuthResponse>('/auth/register', { email, password, name })
  setAuthToken(response.data.token)
  return response.data.user
}

export async function login(email: string, password: string) {
  const response = await api.post<AuthResponse>('/auth/login', { email, password })
  setAuthToken(response.data.token)
  return response.data.user
}

export async function getCurrentUser() {
  const response = await api.get<{ user: User }>('/auth/me')
  return response.data.user
}
