import { createContext, useContext, useEffect, useRef, useState } from 'react'
import * as Linking from 'expo-linking'
import * as SecureStore from 'expo-secure-store'
import { apiRequest } from './api'
import { defaultApiBase, friendlyAuthError, normalizeApiBase, parseSignInLink, storeApiBase } from './config'
import { phonePlatform } from './platform'
import { setUnauthorizedHandler } from './api'

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
  linkError: string
  clearLinkError: () => void
  requestLink: (email: string) => Promise<void>
  completeLink: (url: string) => Promise<void>
  signInWithCode: (email: string, code: string) => Promise<void>
  replaceToken: (accessToken: string) => Promise<void>
  updateVolunteer: (patch: Partial<VolunteerProfile>) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [volunteer, setVolunteer] = useState<VolunteerProfile | null>(null)
  const [apiBase, setApiBaseState] = useState(defaultApiBase())
  const apiBaseRef = useRef(apiBase)
  apiBaseRef.current = apiBase
  const [linkError, setLinkError] = useState('')
  const handledLinks = useRef(new Set<string>())
  const tokenRef = useRef<string | null>(null)
  const signingOut = useRef(false)
  tokenRef.current = token

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [storedToken, storedVolunteer, storedBase] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(VOLUNTEER_KEY),
        SecureStore.getItemAsync(API_BASE_KEY),
      ])
      if (cancelled) return
      if (__DEV__) {
        if (storedBase) setApiBaseState(normalizeApiBase(storedBase))
      } else if (storedBase && normalizeApiBase(storedBase) !== storeApiBase()) {
        await SecureStore.deleteItemAsync(API_BASE_KEY)
      }
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
      void completeLink(url).catch((err: unknown) => {
        handledLinks.current.delete(url)
        const message = err instanceof Error ? err.message : 'Could not sign in with that link'
        setLinkError(friendlyAuthError(message))
      })
    }

    void Linking.getInitialURL().then(handleUrl)
    const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url))
    return () => subscription.remove()
  }, [apiBase, ready])

  async function setApiBase(value: string) {
    const next = normalizeApiBase(value)
    apiBaseRef.current = next
    setApiBaseState(next)
    if (__DEV__) await SecureStore.setItemAsync(API_BASE_KEY, next)
  }

  async function requestLink(email: string) {
    await apiRequest(apiBaseRef.current, '/api/auth/magic-link/send', {
      method: 'POST',
      body: { email: email.trim(), client: 'mobile' },
    })
  }

  async function completeLink(url: string) {
    const parsed = parseSignInLink(url)
    if (!parsed) throw new Error('That link is not a TheoShift sign-in link.')
    setLinkError('')
    const result = await apiRequest<{
      data: { accessToken: string; volunteer: VolunteerProfile }
    }>(apiBaseRef.current, '/api/auth/mobile/exchange', {
      method: 'POST',
      body: { ...parsed, platform: phonePlatform() },
    })
    await saveSession(result.data.accessToken, result.data.volunteer)
  }

  async function saveSession(accessToken: string, profile: VolunteerProfile) {
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken)
    await SecureStore.setItemAsync(VOLUNTEER_KEY, JSON.stringify(profile))
    tokenRef.current = accessToken
    setToken(accessToken)
    setVolunteer(profile)
  }

  async function signInWithCode(email: string, code: string) {
    setLinkError('')
    const result = await apiRequest<{
      data: { accessToken: string; volunteer: VolunteerProfile }
    }>(apiBaseRef.current, '/api/auth/sign-in-code', {
      method: 'POST',
      body: { email: email.trim(), code, client: 'mobile', platform: phonePlatform() },
    })
    await saveSession(result.data.accessToken, result.data.volunteer)
  }

  async function replaceToken(accessToken: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken)
    tokenRef.current = accessToken
    setToken(accessToken)
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut()
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  async function updateVolunteer(patch: Partial<VolunteerProfile>) {
    if (!volunteer) return
    const next = { ...volunteer, ...patch }
    await SecureStore.setItemAsync(VOLUNTEER_KEY, JSON.stringify(next))
    setVolunteer(next)
  }

  async function signOut() {
    if (signingOut.current) return
    signingOut.current = true
    const current = tokenRef.current
    try {
      if (current) {
        await apiRequest(apiBaseRef.current, '/api/volunteer/sessions', {
          method: 'POST',
          token: current,
          body: { action: 'revoke-current' },
        })
      }
    } catch {
      // Still clear this phone if the server is unreachable.
    } finally {
      await SecureStore.deleteItemAsync(TOKEN_KEY)
      await SecureStore.deleteItemAsync(VOLUNTEER_KEY)
      tokenRef.current = null
      setToken(null)
      setVolunteer(null)
      signingOut.current = false
    }
  }

  const value = {
    ready,
    token,
    volunteer,
    apiBase,
    setApiBase,
    linkError,
    clearLinkError: () => setLinkError(''),
    requestLink,
    completeLink,
    signInWithCode,
    replaceToken,
    updateVolunteer,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
