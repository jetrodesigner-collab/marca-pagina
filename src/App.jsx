import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Signup from './pages/Signup'
import CompleteProfile from './pages/CompleteProfile'
import Library from './pages/Library'

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

  return <Library session={session} />
}
