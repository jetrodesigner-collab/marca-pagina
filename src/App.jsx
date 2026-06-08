import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Signup from './pages/Signup'
import CompleteProfile from './pages/CompleteProfile'

export default function App() {
  const [session, setSession] = useState(null)
  const [profileExists, setProfileExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [authView, setAuthView] = useState('login')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session
      setSession(s)
      if (s) {
        const { data: profile } = await supabase
          .from('profiles').select('id').eq('id', s.user.id).maybeSingle()
        setProfileExists(!!profile)
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) { setProfileExists(false); return }
      supabase.from('profiles').select('id').eq('id', newSession.user.id).maybeSingle()
        .then(({ data: profile }) => setProfileExists(!!profile))
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return null

  if (!session) {
    return authView === 'login'
      ? <Login onShowSignup={() => setAuthView('signup')} />
      : <Signup onShowLogin={() => setAuthView('login')} />
  }

  if (!profileExists) {
    return <CompleteProfile session={session} onDone={() => setProfileExists(true)} />
  }

  // S2 placeholder — biblioteca (fase seguinte)
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
