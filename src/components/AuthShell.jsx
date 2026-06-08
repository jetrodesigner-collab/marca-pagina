import CoverCarousel from './CoverCarousel'

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

export default function AuthShell({ children, subtitle = 'sua biblioteca pessoal' }) {
  return (
    <div className="dark" style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 430, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          {BLOBS.map((b, i) => (
            <div key={i} style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(55px)', ...b }} />
          ))}
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, padding: '40px 22px 30px' }}>
          <CoverCarousel />
          <div className="llogo"><div className="lan">marca<em>·página</em></div></div>
          <div className="ltag">{subtitle}</div>
          {children}
        </div>
      </div>
    </div>
  )
}
