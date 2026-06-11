import { useState } from 'react'

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

export default function ManualMovieEntry({ onBack }) {
  const [theme] = useState(() => localStorage.getItem('tema') || 'D')
  const themeClass = theme === 'L' ? 'light' : 'dark'

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
          <div className="ph-t">Cadastrar Filme/Série</div>
        </div>

        <div className="gl" />

        <div className="sc" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🎬</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Em construção</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 260 }}>
            Em breve você poderá cadastrar manualmente um filme ou série que não foi encontrado na biblioteca.
          </div>
        </div>
      </div>
    </div>
  )
}
