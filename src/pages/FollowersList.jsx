import { useState } from 'react'
import { useFollowersList } from '../hooks/useFollowersList'

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

export default function FollowersList({ userId, onNavigate, onBack }) {
  const [theme] = useState(() => localStorage.getItem('tema') || 'D')
  const themeClass = theme === 'L' ? 'light' : 'dark'
  const { followers, loading } = useFollowersList(userId)

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
          <div className="ph-t">Seguidores</div>
        </div>

        <div className="gl" />

        <div className="sc">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <div className="spin" />
            </div>
          ) : followers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0 24px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>Nenhum seguidor ainda.</div>
            </div>
          ) : (
            followers.map(f => {
              const name = f.full_name || f.username || 'Usuário'
              const initial = name.charAt(0).toUpperCase()
              return (
                <div key={f.id} className="flw-row" onClick={() => onNavigate('publicProfile', { userId: f.id })}>
                  <div className="flw-av">
                    {f.avatar_url
                      ? <img src={f.avatar_url} alt="" />
                      : initial}
                  </div>
                  <div className="flw-info">
                    <div className="flw-name">{f.full_name || f.username}</div>
                    {f.username && <div className="flw-user">@{f.username}</div>}
                  </div>
                  <button
                    className="flw-visit"
                    onClick={e => { e.stopPropagation(); onNavigate('publicProfile', { userId: f.id }) }}
                  >
                    Ver perfil
                  </button>
                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}
