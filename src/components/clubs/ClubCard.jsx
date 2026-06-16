function CoverImg({ src, fallback }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 5 }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return <span style={{ fontSize: 18 }}>{fallback || '📚'}</span>
}

export default function ClubCard({ club, onClick }) {
  return (
    <div className="cl-card" onClick={onClick}>
      <div
        className="cl-card-cover"
        style={{
          background: club.livro_capa ? 'transparent' : 'rgba(196,168,240,.1)',
        }}
      >
        <CoverImg src={club.livro_capa} fallback="📚" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {club.nome}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {club.livro_titulo
            ? `${club.livro_titulo}${club.livro_autor ? ' · ' + club.livro_autor : ''}`
            : 'Sem livro selecionado'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--muted)' }}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="8" cy="6" r="3"/>
              <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
            </svg>
            {club.member_count || 0} membros
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 10,
              background: club.privacidade === 'publico' ? 'rgba(126,223,168,.13)' : 'rgba(240,201,122,.13)',
              color: club.privacidade === 'publico' ? '#7EDFA8' : '#F0C97A',
            }}
          >
            {club.privacidade === 'publico' ? 'Público' : 'Privado'}
          </span>
        </div>
      </div>

      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--muted)', flexShrink: 0 }}>
        <polyline points="6 4 10 8 6 12"/>
      </svg>
    </div>
  )
}
