import { useState } from 'react'
import { useMyComments } from '../hooks/useMyComments'
import { formatCommentDate } from '../utils/formatDate'

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

function contextInfo(c) {
  if (c.items) return { icon: c.items.type === 'movie' ? '🎬' : '📚', label: c.items.title }
  if (c.posts) return { icon: '📢', label: c.posts.title || 'Post na comunidade' }
  if (c.reviews) return { icon: '✍️', label: c.reviews.items?.title ? `Resenha · ${c.reviews.items.title}` : 'Resenha' }
  return { icon: '💬', label: '' }
}

export default function MyComments({ session, onNavigate }) {
  const [theme] = useState(() => localStorage.getItem('tema') || 'D')
  const themeClass = theme === 'L' ? 'light' : 'dark'
  const { comments, loading } = useMyComments(session.user.id)

  function handleClick(c) {
    if (c.items) {
      onNavigate('item', { item: c.items, userItem: null, isOwner: false, initialTab: 'C' })
    } else if (c.posts) {
      onNavigate('publicProfile', { userId: c.posts.user_id, initialContentTab: 'posts' })
    } else if (c.reviews) {
      onNavigate('publicProfile', { userId: c.reviews.user_id, initialContentTab: 'reviews' })
    }
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
          <div className="ph-t">Meus comentários</div>
        </div>

        <div className="gl" />

        <div className="sc">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <div className="spin" />
            </div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0 24px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>Nenhum comentário ainda</div>
              <div style={{ fontSize: 11, lineHeight: 1.55 }}>Você ainda não comentou em nada no marca·página</div>
            </div>
          ) : (
            comments.map(c => {
              const ctx = contextInfo(c)
              return (
                <div key={c.id} className="mycmt-item" onClick={() => handleClick(c)}>
                  <div className="mycmt-text">{c.content}</div>
                  <div className="mycmt-meta">{ctx.icon} {ctx.label} · {formatCommentDate(c.created_at)}</div>
                </div>
              )
            })
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
          <div className="ni on" onClick={() => onNavigate('profile')}>
            <span className="nic">👤</span>
            <span className="nla">Perfil</span>
          </div>
        </div>

      </div>
    </div>
  )
}
