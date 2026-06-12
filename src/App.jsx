import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useLastSeen } from './hooks/useLastSeen'
import Login from './pages/Login'
import Signup from './pages/Signup'
import CompleteProfile from './pages/CompleteProfile'
import Library from './pages/Library'
import Search from './pages/Search'
import ItemDetail from './pages/ItemDetail'
import Profile from './pages/Profile'
import Community from './pages/Community'
import PublicProfile from './pages/PublicProfile'
import ManualBookEntry from './pages/ManualBookEntry'
import ManualMovieEntry from './pages/ManualMovieEntry'

export default function App() {
  const [session, setSession] = useState(null)
  const [profileExists, setProfileExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [authView, setAuthView] = useState('login')
  const [screen, setScreen] = useState('library')
  const [itemContext, setItemContext] = useState(null) // { item, userItem }
  const [profileContext, setProfileContext] = useState(null) // { userId }

  useLastSeen(session?.user?.id)

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
      if (!newSession) { setProfileExists(false); setScreen('library'); return }
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

  function navigate(target, payload = null) {
    setScreen(target)
    if (target === 'item' && payload) setItemContext(payload)
    if (target === 'publicProfile' && payload) setProfileContext(payload)
  }

  if (screen === 'item' && itemContext) {
    return (
      <ItemDetail
        session={session}
        item={itemContext.item}
        userItem={itemContext.userItem}
        isOwner={itemContext.isOwner ?? true}
        onBack={() => setScreen('library')}
        onUserItemUpdate={updated => setItemContext(c => ({ ...c, userItem: updated }))}
      />
    )
  }

  if (screen === 'search') {
    return <Search session={session} onNavigate={navigate} />
  }

  if (screen === 'profile') {
    return <Profile session={session} onNavigate={navigate} />
  }

  if (screen === 'community') {
    return <Community session={session} onNavigate={navigate} />
  }

  if (screen === 'publicProfile' && profileContext) {
    return (
      <PublicProfile
        userId={profileContext.userId}
        onNavigate={navigate}
        onBack={() => setScreen('community')}
      />
    )
  }

  if (screen === 's9') {
    return <ManualBookEntry onBack={() => setScreen('library')} />
  }

  if (screen === 's10') {
    return <ManualMovieEntry onBack={() => setScreen('library')} />
  }

  return <Library session={session} onNavigate={navigate} />
}
