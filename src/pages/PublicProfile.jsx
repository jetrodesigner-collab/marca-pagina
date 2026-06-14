import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { usePublicProfile } from '../hooks/usePublicProfile'
import { formatCommentDate } from '../utils/formatDate'
import ExpandableText from '../components/ExpandableText'
import CommentThread from '../components/comments/CommentThread'
import PostCard from '../components/community/PostCard'

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

function placeholderClass(item) {
  const colors = item?.type === 'movie' ? FILM_COLORS : COVER_COLORS
  return colors[hashToIndex(item?.title || '?', colors.length)]
}

function RecentCover({ item }) {
  const [err, setErr] = useState(false)
  if (item?.cover_url && !err) {
    return <img className="mncov" src={item.cover_url} alt="" onError={() => setErr(true)} />
  }
  return (
    <div className={`mncov ${placeholderClass(item)}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 12 }}>
        {(item?.title || '?').charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

function ReviewCover({ item }) {
  const [err, setErr] = useState(false)
  if (item?.cover_url && !err) {
    return <img className="prcc" src={item.cover_url} alt="" onError={() => setErr(true)} />
  }
  return (
    <div className={`prcc ${placeholderClass(item)}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 11 }}>
        {(item?.title || '?').charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

function ReviewCard({ review, currentUserId, onToggleLike }) {
  const [commentsOpen, setCommentsOpen] = useState(false)
  const threadRef = useRef(null)

  function handleCommentClick() {
    setCommentsOpen(o => {
      const next = !o
      if (next) setTimeout(() => threadRef.current?.focusInput(), 50)
      return next
    })
  }

  return (
    <div className="prc">
      <ReviewCover item={review.items} />
      <div className="prcb">
        <div className="prcbk">
          {review.items?.title}{(review.items?.author || review.items?.director) ? ` · ${review.items.author || review.items.director}` : ''}
        </div>
        <ExpandableText text={review.body} />
        <div className="prcd">{formatCommentDate(review.created_at)} · 🌐 Pública</div>
        <div className="post-actions">
          <button className={`cma-btn${review.likedByMe ? ' liked' : ''}`} onClick={() => onToggleLike(review.id)}>
            <span className="heart">{review.likedByMe ? '❤️' : '🤍'}</span> <span>{review.likeCount}</span>
          </button>
          <div className="cma-sep" />
          <button className="cma-btn" onClick={handleCommentClick}>
            💬 <span>{review.commentCount} comentário{review.commentCount === 1 ? '' : 's'}</span>
          </button>
        </div>
        {commentsOpen && (
          <CommentThread ref={threadRef} target={{ reviewId: review.id }} currentUserId={currentUserId} />
        )}
      </div>
    </div>
  )
}

export default function PublicProfile({ session, userId, onNavigate, onBack, initialContentTab = 'reviews' }) {
  const [theme] = useState(() => localStorage.getItem('tema') || 'D')
  const [recentTab, setRecentTab] = useState('books')
  const [contentTab, setContentTab] = useState(initialContentTab)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [toast, setToast] = useState(null)
  const {
    profile, stats, recentBooks, recentMovies, publicReviews, privateReviews, posts, loading,
    toggleReviewLike, togglePostLike,
  } = usePublicProfile(userId, session.user.id)

  const themeClass = theme === 'L' ? 'light' : 'dark'

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  async function handleReport() {
    if (reporting) return
    setReporting(true)
    const { error } = await supabase.from('reports').insert({ reporter_id: session.user.id, reported_id: userId })
    setReporting(false)
    setReportModalOpen(false)
    setToast(error ? 'Erro ao enviar denúncia' : 'Denúncia enviada')
  }

  function formatLink(url) {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0]
  }

  function makeHref(url) {
    return url.startsWith('http') ? url : `https://${url}`
  }

  function goToItem(item) {
    onNavigate('item', { item, userItem: null, isOwner: false })
  }

  const name = profile?.full_name || profile?.username || 'Usuário'
  const initial = name.charAt(0).toUpperCase()
  const avatarCls = AVATAR_GRADIENTS[hashToIndex(userId, AVATAR_GRADIENTS.length)]

  const recentList = recentTab === 'books' ? recentBooks : recentMovies
  const hasRecent = recentBooks.length > 0 || recentMovies.length > 0
  const hasContent = publicReviews.length > 0 || posts.length > 0

  return (
    <div
      className={themeClass}
      style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
    >
      {BLOBS.map((b, i) => (
        <div key={i} style={{ position: 'fixed', borderRadius: '50%', filter: 'blur(55px)', pointerEvents: 'none', zIndex: 0, ...b }} />
      ))}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        <div className="ph">
          <div className="bk" onClick={onBack}>←</div>
          <div className="ph-t">Perfil</div>
        </div>

        <div className="gl" />

        <div className="sc">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--muted)' }}>
              Carregando...
            </div>
          ) : (
            <>
              <div className="phero">
                <div className={`pav float-av ${profile?.avatar_url ? '' : avatarCls}`}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initial}
                </div>
                <div className="pn">{name}</div>
                <div className="ph2">@{profile?.username}</div>

                {profile?.bio && <div className="bio">{profile.bio}</div>}

                {(profile?.link_1 || profile?.link_2) && (
                  <div className="slinks">
                    {profile.link_1 && (
                      <a className="sl2" href={makeHref(profile.link_1)} target="_blank" rel="noopener noreferrer">
                        <span>🔗</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatLink(profile.link_1)}</span>
                      </a>
                    )}
                    {profile.link_2 && (
                      <a className="sl2" href={makeHref(profile.link_2)} target="_blank" rel="noopener noreferrer">
                        <span>🔗</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatLink(profile.link_2)}</span>
                      </a>
                    )}
                  </div>
                )}

                <div className="psts">
                  <div className="pst"><span className="pstn">{stats.books}</span><span className="pstl">Livros</span></div>
                  <div className="pst"><span className="pstn">{stats.movies}</span><span className="pstl">Filmes</span></div>
                  <div className="pst"><span className="pstn">{stats.reviews}</span><span className="pstl">Resenhas</span></div>
                </div>
              </div>

              {!hasRecent && !hasContent && privateReviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0 24px', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>Nada por aqui ainda</div>
                  <div style={{ fontSize: 11, lineHeight: 1.55 }}>{name} ainda não adicionou livros, filmes ou resenhas</div>
                </div>
              ) : (
                <>
                  {hasRecent && (
                    <>
                      <div className="itabs2">
                        <div className={`it2${recentTab === 'books' ? ' on' : ''}`} onClick={() => setRecentTab('books')}>📚 Lidos recentes</div>
                        <div className={`it2${recentTab === 'movies' ? ' on' : ''}`} onClick={() => setRecentTab('movies')}>🎬 Filmes recentes</div>
                      </div>
                      {recentList.length > 0 ? (
                        <div className="mnr">
                          {recentList.map(ui => (
                            <div key={ui.items.id} className="mnc" onClick={() => goToItem(ui.items)}>
                              <RecentCover item={ui.items} />
                              <div className="mnt">{ui.items.title}</div>
                              <div className="mna">{ui.items.author || ui.items.director || ''}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--muted)', padding: '4px 0 16px' }}>
                          {recentTab === 'books' ? 'Nenhum livro lido ainda.' : 'Nenhum filme assistido ainda.'}
                        </div>
                      )}
                    </>
                  )}

                  {hasContent && (
                    <>
                      <div className="itabs2">
                        <div className={`it2${contentTab === 'reviews' ? ' on' : ''}`} onClick={() => setContentTab('reviews')}>✍️ Resenhas públicas</div>
                        <div className={`it2${contentTab === 'posts' ? ' on' : ''}`} onClick={() => setContentTab('posts')}>📢 Posts públicos</div>
                      </div>
                      {contentTab === 'reviews' ? (
                        publicReviews.length > 0 ? (
                          publicReviews.map(r => (
                            <ReviewCard key={r.id} review={r} currentUserId={session.user.id} onToggleLike={toggleReviewLike} />
                          ))
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--muted)', padding: '4px 0 16px' }}>Nenhuma resenha pública ainda.</div>
                        )
                      ) : (
                        posts.length > 0 ? (
                          posts.map(post => (
                            <PostCard
                              key={post.id}
                              post={post}
                              currentUserId={session.user.id}
                              onNavigate={onNavigate}
                              onToggleLike={togglePostLike}
                              onDelete={() => {}}
                            />
                          ))
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--muted)', padding: '4px 0 16px' }}>Nenhum post público ainda.</div>
                        )
                      )}
                    </>
                  )}

                  {privateReviews.length > 0 && (
                    <>
                      <div className="slb">Resenhas privadas</div>
                      {privateReviews.map(r => (
                        <div key={r.id} className="lkc">
                          <div className="lki">🔒</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>{r.items?.title}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>Resenha privada</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}

              {userId !== session.user.id && (
                <div className="report-link" onClick={() => setReportModalOpen(true)}>Denunciar conta</div>
              )}
            </>
          )}
        </div>

        {/* Bottom navigation */}
        <div className="bnav">
          <div className="ni" onClick={() => onNavigate('library')}>
            <span className="nic">📚</span>
            <span className="nla">Biblioteca</span>
          </div>
          <div className="ni" onClick={() => onNavigate('community')}>
            <span className="nic">👥</span>
            <span className="nla">Comunidade</span>
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

      {/* Modal de confirmação de denúncia */}
      {reportModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            padding: '0 20px',
          }}
          onClick={e => { if (e.target === e.currentTarget && !reporting) setReportModalOpen(false) }}
        >
          <div style={{
            width: '100%', maxWidth: 360,
            background: 'var(--bg)', backgroundImage: 'var(--bg)',
            border: '1px solid var(--bor)',
            borderRadius: 22, padding: '24px 20px',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', textAlign: 'center', marginBottom: 8 }}>
              Denunciar conta?
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.55, marginBottom: 22 }}>
              Deseja denunciar esta conta? Esta ação será revisada pela equipe do marca·página.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setReportModalOpen(false)}
                disabled={reporting}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 14,
                  border: '1px solid var(--bor2)', background: 'var(--sur)',
                  color: 'var(--text)', fontFamily: "'Figtree', sans-serif",
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleReport}
                disabled={reporting}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 14,
                  border: 'none', background: '#E57373',
                  color: '#fff', fontFamily: "'Figtree', sans-serif",
                  fontSize: 13, fontWeight: 700, cursor: reporting ? 'default' : 'pointer',
                  opacity: reporting ? 0.7 : 1,
                }}
              >
                {reporting ? 'Enviando...' : 'Sim, denunciar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
