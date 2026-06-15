import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { useLastSeen } from './hooks/useLastSeen'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ResetPassword from './pages/ResetPassword'
import CompleteProfile from './pages/CompleteProfile'
import Library from './pages/Library'
import Search from './pages/Search'
import ItemDetail from './pages/ItemDetail'
import Profile from './pages/Profile'
import Community from './pages/Community'
import PublicProfile from './pages/PublicProfile'
import PostForm from './pages/PostForm'
import MyComments from './pages/MyComments'
import MyReviews from './pages/MyReviews'
import MyPosts from './pages/MyPosts'
import ManualBookEntry from './pages/ManualBookEntry'
import ManualMovieEntry from './pages/ManualMovieEntry'
import AdminPanel from './pages/AdminPanel'
import FollowersList from './pages/FollowersList'

export default function App() {
  const [session, setSession] = useState(null)
  const [profileExists, setProfileExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [authView, setAuthView] = useState('login')
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [screen, setScreen] = useState('library')
  const [itemContext, setItemContext] = useState(null) // { item, userItem }
  const [profileContext, setProfileContext] = useState(null) // { userId }
  const [searchContext, setSearchContext] = useState(null) // { fromStatus }
  const [postContext, setPostContext] = useState(null) // { post }
  const [libraryReopen, setLibraryReopen] = useState(null) // { category, collectionId }
  const navStackRef = useRef(['library'])

  useLastSeen(session?.user?.id)

  // Aplica uma tela a partir do estado lógico (push/pop), sem tocar no histórico
  function applyScreen(target, payload) {
    setScreen(target)
    if (target === 'item' && payload) setItemContext(payload)
    if (target === 'publicProfile' && payload) setProfileContext(payload)
    if (target === 'followers' && payload) setProfileContext(payload)
    if (target === 'search') setSearchContext(payload)
    if (target === 'postForm') setPostContext(payload)
  }

  // Navegação que mantém o histórico do navegador sincronizado, para que o
  // botão "voltar" do Android percorra as telas visitadas em vez de fechar o app
  function navigate(target, payload = null) {
    if (target === screen) {
      applyScreen(target, payload)
      return
    }
    const stack = navStackRef.current
    if (stack.length >= 2 && stack[stack.length - 2] === target) {
      window.history.back()
      return
    }
    stack.push(target)
    window.history.pushState({ screen: target, payload }, '')
    applyScreen(target, payload)
  }

  // Histórico: estado inicial + listener de popstate (botão voltar)
  useEffect(() => {
    window.history.replaceState({ screen: 'library' }, '')
    function onPopState(e) {
      const state = e.state || { screen: 'library' }
      const stack = navStackRef.current
      if (stack.length > 1) stack.pop()
      applyScreen(state.screen, state.payload)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

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
      if (_event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (!newSession) {
        setProfileExists(false)
        setPasswordRecovery(false)
        navStackRef.current = ['library']
        window.history.replaceState({ screen: 'library' }, '')
        setScreen('library')
        return
      }
      supabase.from('profiles').select('id').eq('id', newSession.user.id).maybeSingle()
        .then(({ data: profile }) => setProfileExists(!!profile))
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return null

  if (passwordRecovery && session) {
    return <ResetPassword />
  }

  if (!session) {
    return authView === 'login'
      ? <Login onShowSignup={() => setAuthView('signup')} />
      : <Signup onShowLogin={() => setAuthView('login')} />
  }

  if (!profileExists) {
    return <CompleteProfile session={session} onDone={() => setProfileExists(true)} />
  }

  if (screen === 'item' && itemContext) {
    return (
      <ItemDetail
        session={session}
        item={itemContext.item}
        userItem={itemContext.userItem}
        isOwner={itemContext.isOwner ?? true}
        initialTab={itemContext.initialTab}
        initialReviewEdit={itemContext.initialReviewEdit}
        onBack={() => {
          if (itemContext.origin?.collectionId) {
            setLibraryReopen({ category: itemContext.origin.category, collectionId: itemContext.origin.collectionId })
          }
          navigate('library')
        }}
        onUserItemUpdate={updated => setItemContext(c => ({ ...c, userItem: updated }))}
        onNavigate={navigate}
      />
    )
  }

  if (screen === 'search') {
    return <Search session={session} onNavigate={navigate} searchContext={searchContext} />
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
        session={session}
        userId={profileContext.userId}
        initialContentTab={profileContext.initialContentTab}
        onNavigate={navigate}
        onBack={() => navigate('community')}
      />
    )
  }

  if (screen === 'followers' && profileContext) {
    return (
      <FollowersList
        userId={profileContext.userId}
        onNavigate={navigate}
        onBack={() => window.history.back()}
      />
    )
  }

  if (screen === 'postForm') {
    return <PostForm session={session} onNavigate={navigate} post={postContext?.post ?? null} />
  }

  if (screen === 'myComments') {
    return <MyComments session={session} onNavigate={navigate} />
  }

  if (screen === 'myReviews') {
    return <MyReviews session={session} onNavigate={navigate} />
  }

  if (screen === 'myPosts') {
    return <MyPosts session={session} onNavigate={navigate} />
  }

  if (screen === 's9') {
    return <ManualBookEntry session={session} onNavigate={navigate} />
  }

  if (screen === 's10') {
    return <ManualMovieEntry session={session} onNavigate={navigate} />
  }

  if (screen === 'admin') {
    return <AdminPanel session={session} onNavigate={navigate} />
  }

  return (
    <Library
      session={session}
      onNavigate={navigate}
      reopen={libraryReopen}
      onReopenConsumed={() => setLibraryReopen(null)}
    />
  )
}
