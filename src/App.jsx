import { useState } from 'react'

export default function App() {
  const [theme, setTheme] = useState('light')

  return (
    <div className={theme} style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      {/* Blobs de fundo */}
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0
      }}>
        <div style={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', filter: 'blur(55px)', background: 'var(--bl1)', top: -80, left: -80 }} />
        <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', filter: 'blur(55px)', background: 'var(--bl2)', top: 100, right: -70 }} />
        <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', filter: 'blur(55px)', background: 'var(--bl3)', bottom: 120, left: -60 }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', filter: 'blur(55px)', background: 'var(--bl4)', bottom: 40, right: -50 }} />
      </div>

      {/* Container principal */}
      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 430,
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24
      }}>
        <h1 style={{
          fontFamily: 'Figtree, sans-serif',
          fontSize: 32,
          fontWeight: 800,
          color: 'var(--text)',
          letterSpacing: '-0.02em'
        }}>
          marca<em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--accent)' }}>·</em>página
        </h1>

        <p style={{ color: 'var(--text2)', fontSize: 14, textAlign: 'center' }}>
          Projeto configurado com sucesso!<br />
          React + Vite + Tailwind + Supabase prontos.
        </p>

        <button
          onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
          style={{
            padding: '10px 24px',
            borderRadius: 14,
            background: 'var(--accent-g)',
            border: 'none',
            color: '#fff',
            fontFamily: 'Figtree, sans-serif',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 4px 16px var(--btn-shad)'
          }}
        >
          Alternar tema ({theme})
        </button>
      </div>
    </div>
  )
}
