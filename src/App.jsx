import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Signup from './pages/Signup'

export default function App() {
  const [session, setSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [authView, setAuthView] = useState('login')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCheckingSession(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (checkingSession) return null

  if (!session) {
    return authView === 'login'
      ? <Login onShowSignup={() => setAuthView('signup')} />
      : <Signup onShowLogin={() => setAuthView('login')} />
  }

  // S2 (biblioteca) ainda não foi construída — placeholder pós-login
  return (
    <div className="dark" style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--bg)'
    }}>
      <p style={{ color: 'var(--text)', fontFamily: 'Figtree, sans-serif', fontSize: 14 }}>
        Logado como {session.user.email}
      </p>
      <button
        onClick={() => supabase.auth.signOut()}
        className="savebtn"
        style={{ width: 'auto', padding: '10px 24px' }}
      >
        Sair
      </button>
    </div>
  )
}
