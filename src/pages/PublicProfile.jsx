import { useState } from 'react'
import { usePublicProfile } from '../hooks/usePublicProfile'
import { formatCommentDate } from '../components/comments/CommentCard'

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

export default function PublicProfile({ userId, onNavigate, onBack }) {
  const [theme] = useState(() => localStorage.getItem('tema') || 'D')
  const { profile, stats, recentItems, publicReviews, privateReviews, loading } = usePublicProfile(userId)

  const themeClass = theme === 'L' ? 'light' : 'dark'

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

              {recentItems.length > 0 && (
                <>
                  <div className="slb">Lidos recentemente</div>
                  <div className="mnr">
                    {recentItems.map(ui => (
                      <div key={ui.items.id} className="mnc" onClick={() => goToItem(ui.items)}>
                        <RecentCover item={ui.items} />
                        <div className="mnt">{ui.items.title}</div>
                        <div className="mna">{ui.items.author || ui.items.director || ''}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {publicReviews.length > 0 && (
                <>
                  <div className="slb">Resenhas públicas</div>
                  {publicReviews.map(r => (
                    <div key={r.id} className="prc">
                      <ReviewCover item={r.items} />
                      <div className="prcb">
                        <div className="prcbk">
                          {r.items?.title}{(r.items?.author || r.items?.director) ? ` · ${r.items.author || r.items.director}` : ''}
                        </div>
                        <div className="prct">{r.body}</div>
                        <div className="prcd">{formatCommentDate(r.created_at)} · 🌐 Pública</div>
                      </div>
                    </div>
                  ))}
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
        </div>

      </div>
    </div>
  )
}
