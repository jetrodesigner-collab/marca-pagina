import { useState } from 'react'
import { supabase } from '../lib/supabase'
import AuthShell from '../components/AuthShell'

export default function Signup({ onShowLogin }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  async function handleSignup(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setInfo('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
  }

  return (
    <AuthShell>
      <div className="lcard">
        <form onSubmit={handleSignup}>
          <span className="flab">Nome de usuário</span>
          <input
            className="finp" type="text" placeholder="seu_usuario"
            value={username} onChange={e => setUsername(e.target.value)} required
          />
          <span className="flab">E-mail</span>
          <input
            className="finp" type="email" placeholder="seu@email.com"
            value={email} onChange={e => setEmail(e.target.value)} required
          />
          <span className="flab">Senha</span>
          <input
            className="finp" type="password" placeholder="••••••••" minLength={6}
            value={password} onChange={e => setPassword(e.target.value)} required
          />
          {error && <p className="ferr">{error}</p>}
          {info && <p className="finfo">{info}</p>}
          <button className="savebtn" type="submit" disabled={loading}>
            {loading ? 'Criando conta…' : 'Criar conta →'}
          </button>
        </form>
      </div>

      <div className="srow">
        Já tem conta? <button type="button" onClick={onShowLogin}>Entrar</button>
      </div>
    </AuthShell>
  )
}
