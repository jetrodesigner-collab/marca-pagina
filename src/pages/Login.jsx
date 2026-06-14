import { useState } from 'react'
import { supabase } from '../lib/supabase'
import AuthShell from '../components/AuthShell'

export default function Login({ onShowSignup }) {
  const [mode, setMode] = useState('login') // 'login' | 'recover'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  function resetMessages() {
    setError(null)
    setInfo(null)
  }

  async function handleLogin(e) {
    e.preventDefault()
    resetMessages()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  async function handleRecover(e) {
    e.preventDefault()
    resetMessages()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://marca-pagina.vercel.app',
    })
    setLoading(false)
    if (error) setError(error.message)
    else setInfo('Enviamos um link de recuperação para o seu e-mail.')
  }

  return (
    <AuthShell>
      <div className="lcard">
        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <span className="flab">E-mail</span>
            <input
              className="finp" type="email" placeholder="seu@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
            <span className="flab">Senha</span>
            <input
              className="finp" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required
            />
            <button type="button" className="flink" onClick={() => { setMode('recover'); resetMessages() }}>
              Esqueci minha senha
            </button>
            {error && <p className="ferr">{error}</p>}
            <button className="savebtn" type="submit" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRecover}>
            <span className="flab">E-mail</span>
            <input
              className="finp" type="email" placeholder="seu@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
            {error && <p className="ferr">{error}</p>}
            {info && <p className="finfo">{info}</p>}
            <button className="savebtn" type="submit" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar link de recuperação'}
            </button>
          </form>
        )}
      </div>

      {mode === 'login' ? (
        <div className="srow">
          Não tem conta? <button type="button" onClick={onShowSignup}>Criar agora</button>
        </div>
      ) : (
        <div className="srow">
          <button type="button" onClick={() => { setMode('login'); resetMessages() }}>← Voltar para o login</button>
        </div>
      )}
    </AuthShell>
  )
}
