import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../hooks/useCommunity'
import { useFollows } from '../hooks/useFollows'
import { usePublicFeed } from '../hooks/usePublicFeed'
import PostCard from '../components/community/PostCard'
import ReviewCard from '../components/community/ReviewCard'

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

const AVATAR_GRADIENTS = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6']
const COVER_COLORS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']
const FILM_COLORS  = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6']

function hashToIndex(str, mod) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % mod
  return Math.abs(hash) % mod
}

function UserAvatar({ user }) {
  const [err, setErr] = useState(false)
  const name = user.full_name || user.username || '?'
  const initial = name.charAt(0).toUpperCase()

  if (user.avatar_url && !err) {
    return (
      <div className="uav">
        <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setErr(true)} />
      </div>
    )
  }

  const cls = AVATAR_GRADIENTS[hashToIndex(user.id, AVATAR_GRADIENTS.length)]
  return <div className={`uav ${cls}`}>{initial}</div>
}

function MiniCover({ item }) {
  const [err, setErr] = useState(false)

  if (item?.cover_url && !err) {
    return <img className="mcc" src={item.cover_url} alt="" onError={() => setErr(true)} />
  }

  const colors = item?.type === 'movie' ? FILM_COLORS : COVER_COLORS
  const cls = colors[hashToIndex(item?.title || '?', colors.length)]
  return <div className={`mcc ${cls}`} />
}

function PostCTAButton({ onClick }) {
  return (
    <div className="post-btn-wrap">
      <button className="post-community-btn" onClick={onClick}>
        <div className="shine" />
        <div className="post-btn-inner">
          <div className="post-btn-icon">✏️</div>
          <div className="post-btn-text">
            <div className="post-btn-title">Faça um post na comunidade</div>
            <div className="post-btn-sub">Compartilhe uma ideia, reflexão ou descoberta</div>
          </div>
          <div className="post-btn-arrow">›</div>
        </div>
      </button>
    </div>
  )
}

export default function Community({ session, onNavigate }) {
  const [theme]   = useState(() => localStorage.getItem('tema') || 'D')
  const [profile, setProfile] = useState(null)
  const [search, setSearch]   = useState('')
  const [mainTab, setMainTab] = useState('F')
  const [peopleTab, setPeopleTab] = useState('A')
  const { users, loading } = useCommunity(session.user.id)
  const { following, toggleFollow } = useFollows(session.user.id)
  const { items: feedItems, loading: feedLoading, toggleLikePost, toggleLikeReview, deletePost } = usePublicFeed(session.user.id)

  const themeClass = theme === 'L' ? 'light' : 'dark'

  useEffect(() => {
    supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [session.user.id])

  const initial = (profile?.full_name || profile?.username || session.user.email || '?')[0].toUpperCase()

  const query = search.trim().toLowerCase()
  const filteredUsers = query
    ? users.filter(u =>
        (u.full_name || '').toLowerCase().includes(query) ||
        (u.username || '').toLowerCase().includes(query)
      )
    : users

  const friends = filteredUsers.filter(u => following.has(u.id))
  const explore = filteredUsers.filter(u => !following.has(u.id))
  const peopleList = peopleTab === 'A' ? friends : explore

  function handleNewPost() {
    onNavigate('postForm', { post: null })
  }

  return (
    <div
      className={themeClass}
      style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
    >
      {BLOBS.map((b, i) => (
        <div key={i} style={{ position: 'fixed', borderRadius: '50%', filter: 'blur(55px)', pointerEvents: 'none', zIndex: 0, ...b }} />
      ))}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* Topbar */}
        <div className="topbar">
          <div className="logo">marca<em>·página</em></div>
          <div
            className="av"
            style={profile?.avatar_url ? { padding: 0, overflow: 'hidden' } : {}}
            onClick={() => onNavigate('profile')}
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initial}
          </div>
        </div>

        <div className="gl" />

        <div className="mtabs">
          <div className={`mt${mainTab === 'F' ? ' on' : ''}`} onClick={() => setMainTab('F')}>📢 Posts públicos</div>
          <div className={`mt${mainTab === 'P' ? ' on' : ''}`} onClick={() => setMainTab('P')}>👥 Pessoas</div>
        </div>

        {mainTab === 'P' ? (
          <div className="sc">
            <PostCTAButton onClick={handleNewPost} />

            <div className="srch">
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>🔍</span>
              <input
                placeholder="Buscar pessoa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="itabs2">
              <div className={`it2${peopleTab === 'A' ? ' on' : ''}`} onClick={() => setPeopleTab('A')}>Amigos</div>
              <div className={`it2${peopleTab === 'E' ? ' on' : ''}`} onClick={() => setPeopleTab('E')}>Explorar</div>
            </div>

            <div className="slb">{peopleTab === 'A' ? 'Seguindo' : 'Descobrir pessoas'}</div>

            {loading && (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--muted)' }}>
                Carregando...
              </div>
            )}

            {!loading && peopleList.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--muted)' }}>
                {query
                  ? 'Nenhuma pessoa encontrada.'
                  : peopleTab === 'A'
                    ? 'Você ainda não segue ninguém. Explore e siga novas pessoas!'
                    : 'Nenhuma pessoa nova para descobrir agora.'}
              </div>
            )}

            {!loading && peopleList.map(user => (
              <div key={user.id} className="uc" onClick={() => onNavigate('publicProfile', { userId: user.id })}>
                <UserAvatar user={user} />
                <div className="ui">
                  <div className="un">{user.full_name || user.username || 'Usuário'}</div>
                  <div className="us">
                    {user.books} livro{user.books === 1 ? '' : 's'} · {user.reviews} resenha{user.reviews === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="mcs">
                  {user.recentCovers.map((item, i) => (
                    <MiniCover key={i} item={item} />
                  ))}
                </div>
                <div style={{ width: 8 }} />
                <button
                  className={`follow-btn${following.has(user.id) ? ' following' : ''}`}
                  onClick={e => { e.stopPropagation(); toggleFollow(user.id) }}
                >
                  {following.has(user.id) ? '✓ Seguindo' : '+ Seguir'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="sc">
            <PostCTAButton onClick={handleNewPost} />

            {feedLoading && (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--muted)' }}>
                Carregando...
              </div>
            )}

            {!feedLoading && feedItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--muted)' }}>
                Nenhuma publicação ainda. Seja o primeiro a compartilhar!
              </div>
            )}

            {!feedLoading && feedItems.map((item, idx) => (
              <div key={item.id}>
                {idx > 0 && <div className="feed-sep" />}
                {item.kind === 'post' ? (
                  <PostCard
                    post={item}
                    currentUserId={session.user.id}
                    onNavigate={onNavigate}
                    onToggleLike={toggleLikePost}
                    onDelete={deletePost}
                  />
                ) : (
                  <ReviewCard
                    review={item}
                    currentUserId={session.user.id}
                    onToggleLike={toggleLikeReview}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Bottom navigation */}
        <div className="bnav">
          <div className="ni" onClick={() => onNavigate('library')}>
            <span className="nic">📚</span>
            <span className="nla">Biblioteca</span>
          </div>
          <div className="ni on">
            <span className="nic">👥</span>
            <span className="nla">Comunidade</span>
          </div>
          <div className="ni" onClick={() => onNavigate('clubes')}>
            <span className="ni-svg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </span>
            <span className="nla">Clubes</span>
          </div>
          <div className="ni" onClick={() => onNavigate('search')}>
            <span className="nic">🔍</span>
            <span className="nla">Buscar</span>
          </div>
          <div className="ni" onClick={() => onNavigate('profile')}>
            <span className="nic">👤</span>
            <span className="nla">Perfil</span>
          </div>
        </div>

      </div>
    </div>
  )
}
