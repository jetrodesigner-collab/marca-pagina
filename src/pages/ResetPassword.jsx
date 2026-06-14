import { useState } from 'react'
import { supabase } from '../lib/supabase'
import AuthShell from '../components/AuthShell'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  async function handleReset(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setInfo('Senha atualizada com sucesso! Redirecionando para o login…')
    setTimeout(() => { supabase.auth.signOut() }, 1500)
  }

  return (
    <AuthShell subtitle="redefinir senha">
      <div className="lcard">
        <form onSubmit={handleReset}>
          <span className="flab">Nova senha</span>
          <input
            className="finp" type="password" placeholder="••••••••" minLength={6}
            value={password} onChange={e => setPassword(e.target.value)} required
          />
          <span className="flab">Confirmar senha</span>
          <input
            className="finp" type="password" placeholder="••••••••" minLength={6}
            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
          />
          {error && <p className="ferr">{error}</p>}
          {info && <p className="finfo">{info}</p>}
          <button className="savebtn" type="submit" disabled={loading || !!info}>
            {loading ? 'Salvando…' : 'Redefinir senha →'}
          </button>
        </form>
      </div>
    </AuthShell>
  )
}
