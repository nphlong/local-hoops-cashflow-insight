import { useSyncExternalStore } from 'react'
import { createStore } from 'zustand/vanilla'
import {
  type AuthUser,
  disableGisAutoSelect,
  userFromCredential,
} from '../auth/googleAuth'

const SESSION_KEY = 'local-hoops-auth'

const readSession = (): AuthUser | null => {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const user = JSON.parse(raw) as AuthUser
    if (!user?.email || !user.exp || user.exp * 1000 <= Date.now()) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return user
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

const writeSession = (user: AuthUser | null) => {
  if (typeof sessionStorage === 'undefined') return
  if (!user) {
    sessionStorage.removeItem(SESSION_KEY)
    return
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export interface AuthState {
  user: AuthUser | null
  error: string | null
  applyCredential: (credential: string) => void
  signOut: () => void
  setError: (error: string | null) => void
}

export const authStore = createStore<AuthState>((set) => ({
  user: readSession(),
  error: null,
  applyCredential: (credential) => {
    try {
      const user = userFromCredential(credential)
      writeSession(user)
      set({ user, error: null })
    } catch (err) {
      writeSession(null)
      set({
        user: null,
        error: err instanceof Error ? err.message : 'Google sign-in failed.',
      })
    }
  },
  signOut: () => {
    disableGisAutoSelect()
    writeSession(null)
    set({ user: null, error: null })
  },
  setError: (error) => set({ error }),
}))

export function useAuthStore(): AuthState {
  return useSyncExternalStore(authStore.subscribe, authStore.getState, authStore.getState)
}
