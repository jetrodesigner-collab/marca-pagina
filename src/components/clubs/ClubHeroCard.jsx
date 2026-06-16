function metaPillText(meta) {
  if (!meta) return null
  const parts = []
  if (meta.cap_inicio && meta.cap_fim) parts.push(`Caps. ${meta.cap_inicio}–${meta.cap_fim}`)
  else if (meta.cap_fim) parts.push(`até cap. ${meta.cap_fim}`)
  if (meta.pagina_fim) parts.push(`até pág. ${meta.pagina_fim}`)
  return parts.length > 0 ? parts.join(' · ') : meta.titulo
}

export default function ClubHeroCard({ club, activeMeta, onEnter, onInvite }) {
  const coverSrc = club.foto_url || club.livro_capa || null

  const pct = activeMeta?.pagina_fim
    ? Math.min(100, Math.round(((club.pagina_atual || 0) / activeMeta.pagina_fim) * 100))
    : 0

  const daysLeft = activeMeta?.data_limite
    ? Math.max(0, Math.ceil((new Date(activeMeta.data_limite) - new Date()) / (1000 * 60 * 60 * 24)))
    : null

  const pillText = metaPillText(activeMeta)

  return (
    <div className="cl-hero">
      <div className="cl-eyebrow">
        <span>📖 LENDO AGORA</span>
        {club.streak_atual > 0 && (
          <div className="cl-streak">
            🔥 <span style={{ fontSize: 14 }}>{club.streak_atual}</span> dias seguidos
          </div>
        )}
      </div>

      <div className="cl-book-row">
        {coverSrc ? (
          <img src={coverSrc} alt="" className="cl-cover" />
        ) : (
          <div className="cl-cover-ph">📚</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25, marginBottom: 5, color: 'var(--text)' }}>
            {club.nome}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {club.livro_titulo
              ? `${club.livro_titulo}${club.livro_autor ? ' · ' + club.livro_autor : ''}`
              : 'Sem livro selecionado'}
          </div>
          {activeMeta && pillText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <div className="cl-meta-pill">
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F0C97A', flexShrink: 0, animation: 'pulse 1.8s infinite' }} />
                {pillText}
              </div>
              {daysLeft !== null && (
                <div style={{ fontSize: 10, fontWeight: 700, color: '#F0C97A', background: 'rgba(240,201,122,.13)', borderRadius: 8, padding: '3px 7px', flexShrink: 0 }}>
                  ⏳ {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
                </div>
              )}
            </div>
          )}
          {daysLeft !== null && (
            <div style={{ fontSize: 10, color: '#F0C97A', fontWeight: 600 }}>
              {daysLeft === 0 ? 'Prazo encerrado' : `${daysLeft} ${daysLeft === 1 ? 'dia restante' : 'dias restantes'}`}
            </div>
          )}
        </div>
      </div>

      {activeMeta?.pagina_fim && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Seu progresso</span>
            <span style={{ fontSize: 11, color: 'rgba(240,235,248,.62)', fontWeight: 500, marginLeft: 'auto' }}>
              pág. {club.pagina_atual || 0} / {activeMeta.pagina_fim}
            </span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,.07)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: 'linear-gradient(90deg,var(--accent),#9B7BD4)' }} />
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <button
          onClick={onEnter}
          style={{
            flex: 1,
            padding: 12,
            background: 'var(--accent)',
            color: '#1A1720',
            border: 'none',
            borderRadius: 8,
            fontFamily: 'Figtree, sans-serif',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Entrar no clube
        </button>
        {onInvite && (
          <button
            onClick={onInvite}
            style={{
              padding: '12px 15px',
              background: 'rgba(196,168,240,.14)',
              color: 'var(--accent)',
              border: '1px solid rgba(196,168,240,.18)',
              borderRadius: 8,
              fontFamily: 'Figtree, sans-serif',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M11 3a3 3 0 110 6M5 3a3 3 0 110 6M1 13c0-2.2 1.8-4 4-4h4c2.2 0 4 1.8 4 4M13 9c1.1 0 2 .9 2 2v2"/>
            </svg>
            Convidar
          </button>
        )}
      </div>
    </div>
  )
}
