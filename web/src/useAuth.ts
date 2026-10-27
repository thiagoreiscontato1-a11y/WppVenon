import {useCallback, useEffect, useState} from 'react'
import {api, setUnauthorizedHandler} from './api'

export type AuthStatus = 'checking' | 'loggedOut' | 'loggedIn'

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [username, setUsername] = useState<string | null>(null)
  const [authEnabled, setAuthEnabled] = useState(true)
  // Shown on the login form after the session expires
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setStatus((current) => {
        if (current === 'loggedIn') setNotice('Sua sessão expirou. Entre novamente.')
        return 'loggedOut'
      })
    })
    api.me()
      .then((auth) => {
        setAuthEnabled(auth.authEnabled)
        setUsername(auth.username)
        setStatus(auth.authenticated ? 'loggedIn' : 'loggedOut')
      })
      .catch(() => setStatus('loggedOut'))
  }, [])

  const login = useCallback(async (user: string, password: string) => {
    const auth = await api.login(user, password)
    setNotice(null)
    setUsername(auth.username)
    setStatus('loggedIn')
  }, [])

  const logout = useCallback(() => {
    api.logout().catch(() => undefined).finally(() => {
      setUsername(null)
      setStatus('loggedOut')
    })
  }, [])

  return {status, username, authEnabled, notice, login, logout}
}
