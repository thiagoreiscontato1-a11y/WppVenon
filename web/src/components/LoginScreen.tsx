import {FormEvent, useState} from 'react'

interface Props {
  notice: string | null
  onLogin: (username: string, password: string) => Promise<void>
}

export function LoginScreen({notice, onLogin}: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onLogin(username.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar')
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="connect">
      <form className="login-card" onSubmit={submit}>
        <h1>WppVenon</h1>
        <p className="muted">Entre para acessar suas conversas</p>
        {notice && !error && <div className="login-notice">{notice}</div>}
        {error && <div className="login-error" role="alert">{error}</div>}
        <label>
          Usuário
          <input
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button className="btn-primary" disabled={busy || !username || !password}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
