import { useState } from 'react'
import { useMyReviews } from '../hooks/useMyReviews'
import { formatCommentDate } from '../utils/formatDate'

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

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

function ReviewCover({ item }) {
  const [err, setErr] = useState(false)
  if (item?.cover_url && !err) {
    return <img className="myrev-cov" src={item.cover_url} alt="" onError={() => setErr(true)} />
  }
  return (
    <div className={`myrev-cov ${placeholderClass(item)}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 14 }}>
        {(item?.title || '?').charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

export default function MyReviews({ session, onNavigate }) {
  const [theme] = useState(() => localStorage.getItem('tema') || 'D')
  const themeClass = theme === 'L' ? 'light' : 'dark'
  const { reviews, loading, deleteReview } = useMyReviews(session.user.id)
  const [confirmId, setConfirmId] = useState(null)
  const [deleting,  setDeleting]  = useState(false)

  function handleEdit(r) {
    onNavigate('item', {
      item: r.items,
      userItem: r.userItem,
      isOwner: true,
      initialTab: 'R',
      initialReviewEdit: true,
    })
  }

  async function handleDelete(reviewId) {
    if (deleting) return
    setDeleting(true)
    await deleteReview(reviewId)
    setDeleting(false)
    setConfirmId(null)
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

        <div className="ph">
          <div className="bk" onClick={() => onNavigate('profile')}>←</div>
          <div className="ph-t">Minhas Resenhas</div>
        </div>

        <div className="gl" />

        <div className="sc">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <div className="spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0 24px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✏️</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>Você ainda não escreveu nenhuma resenha.</div>
            </div>
          ) : (
            reviews.map(r => (
              <div key={r.id} className="myrev-item">
                <ReviewCover item={r.items} />
                <div className="myrev-body">
                  <div className="myrev-title">{r.items?.title}</div>
                  <div className="stars myrev-stars">
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n} className={`star${r.rating >= n ? ' on' : ''}`}>★</span>
                    ))}
                  </div>
                  <div className="myrev-text">{r.body}</div>
                  <div className="myrev-meta">editado {formatCommentDate(r.updated_at)}</div>
                  <div className="myrev-actions">
                    <button className="edit-btn" onClick={() => handleEdit(r)}>✏️ Editar</button>
                    <button className="del-btn" onClick={() => setConfirmId(r.id)}>🗑️ Excluir</button>
                  </div>
                  {confirmId === r.id && (
                    <div className="del-confirm" style={{ marginTop: 10 }}>
                      <span>Tem certeza que deseja excluir esta resenha?</span>
                      <div className="del-confirm-actions">
                        <button className="confirm" onClick={() => handleDelete(r.id)} disabled={deleting}>
                          {deleting ? 'Excluindo...' : 'Confirmar'}
                        </button>
                        <button className="cancel" onClick={() => setConfirmId(null)} disabled={deleting}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
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
          <div className="ni on" onClick={() => onNavigate('profile')}>
            <span className="nic">👤</span>
            <span className="nla">Perfil</span>
          </div>
        </div>

      </div>
    </div>
  )
}
