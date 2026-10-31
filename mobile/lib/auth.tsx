import { createContext, useContext, useEffect, useRef, useState } from 'react'
import * as Linking from 'expo-linking'
import * as SecureStore from 'expo-secure-store'
import { apiRequest } from './api'
import { defaultApiBase, normalizeApiBase, parseSignInLink } from './config'

const TOKEN_KEY = 'theoshift.token'
const VOLUNTEER_KEY = 'theoshift.volunteer'
const API_BASE_KEY = 'theoshift.apiBase'

export type VolunteerProfile = {
  id: string
  email: string
  firstName: string
  lastName: string
}

type AuthContextValue = {
  ready: boolean
  token: string | null
  volunteer: VolunteerProfile | null
  apiBase: string
  setApiBase: (value: string) => void
  requestLink: (email: string) => Promise<void>
  completeLink: (url: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [volunteer, setVolunteer] = useState<VolunteerProfile | null>(null)
  const [apiBase, setApiBaseState] = useState(defaultApiBase())
  const handledLinks = useRef(new Set<string>())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [storedToken, storedVolunteer, storedBase] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(VOLUNTEER_KEY),
        SecureStore.getItemAsync(API_BASE_KEY),
      ])
      if (cancelled) return
      if (storedBase) setApiBaseState(normalizeApiBase(storedBase))
      if (storedToken) setToken(storedToken)
      if (storedVolunteer) {
        try {
          setVolunteer(JSON.parse(storedVolunteer) as VolunteerProfile)
        } catch {
          setVolunteer(null)
        }
      }
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready) return

    const handleUrl = (url: string | null) => {
      if (!url || !parseSignInLink(url) || handledLinks.current.has(url)) return
      handledLinks.current.add(url)
      void completeLink(url).catch(() => {
        handledLinks.current.delete(url)
      })
    }

    void Linking.getInitialURL().then(handleUrl)
    const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url))
    return () => subscription.remove()
  }, [apiBase, ready])

  async function setApiBase(value: string) {
    const next = normalizeApiBase(value)
    setApiBaseState(next)
    await SecureStore.setItemAsync(API_BASE_KEY, next)
  }

  async function requestLink(email: string) {
    await apiRequest(apiBase, '/api/auth/magic-link/send', {
      method: 'POST',
      body: { email: email.trim(), client: 'mobile' },
    })
  }

  async function completeLink(url: string) {
    const parsed = parseSignInLink(url)
    if (!parsed) throw new Error('That link is not a TheoShift sign-in link.')
    const result = await apiRequest<{
      data: { accessToken: string; volunteer: VolunteerProfile }
    }>(apiBase, '/api/auth/mobile/exchange', {
      method: 'POST',
      body: parsed,
    })
    await SecureStore.setItemAsync(TOKEN_KEY, result.data.accessToken)
    await SecureStore.setItemAsync(VOLUNTEER_KEY, JSON.stringify(result.data.volunteer))
    setToken(result.data.accessToken)
    setVolunteer(result.data.volunteer)
  }

  async function signOut() {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(VOLUNTEER_KEY)
    setToken(null)
    setVolunteer(null)
  }

  const value = { ready, token, volunteer, apiBase, setApiBase, requestLink, completeLink, signOut }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
