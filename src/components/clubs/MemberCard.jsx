import { useState } from 'react'

const MEMBER_COLORS = [
  { bg: 'rgba(196,168,240,.14)', color: '#C4A8F0' },
  { bg: 'rgba(126,223,168,.13)', color: '#7EDFA8' },
  { bg: 'rgba(240,201,122,.13)', color: '#F0C97A' },
  { bg: 'rgba(240,122,122,.13)', color: '#F07A7A' },
  { bg: 'rgba(122,170,206,.13)', color: '#7AAACE' },
  { bg: 'rgba(208,130,208,.13)', color: '#D082D0' },
]

function colorFor(id) {
  let h = 0
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) % MEMBER_COLORS.length
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length]
}

function progColor(pct) {
  if (pct >= 100) return 'linear-gradient(90deg,#7EDFA8,#5BC894)'
  if (pct >= 60) return 'linear-gradient(90deg,var(--accent),#9B7BD4)'
  if (pct >= 30) return 'linear-gradient(90deg,#F0C97A,#D4A854)'
  return 'linear-gradient(90deg,#F07A7A,#C86060)'
}

export default function MemberCard({ member, activeMeta, isAdmin, onCutucar, onBadgeClick }) {
  const profile = member.profile || {}
  const name = profile.full_name || profile.username || 'Usuário'
  const initial = name.charAt(0).toUpperCase()
  const color = colorFor(member.user_id)
  const pct = member.pct || 0

  const daysLeft = activeMeta?.data_limite
    ? Math.max(0, Math.ceil((new Date(activeMeta.data_limite) - new Date()) / (1000 * 60 * 60 * 24)))
    : null

  const showCutucar = activeMeta && pct < 50 && daysLeft !== null && daysLeft <= 3

  return (
    <div
      className="cl-mem-card"
      style={pct >= 100 ? { borderColor: 'rgba(126,223,168,.22)' } : pct < 30 && activeMeta ? { borderColor: 'rgba(240,122,122,.20)' } : {}}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          className="cl-mem-ava"
          style={{ background: color.bg, color: color.color }}
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : initial}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
            {name}
            {member.streak_atual > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#FF6B35', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                🔥 {member.streak_atual}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
            {member.postCount} post{member.postCount !== 1 ? 's' : ''} · {member.trechoCount} trecho{member.trechoCount !== 1 ? 's' : ''}
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 10,
            background: member.role === 'admin' ? 'rgba(196,168,240,.14)' : 'rgba(255,255,255,.05)',
            color: member.role === 'admin' ? 'var(--accent)' : 'var(--muted)',
          }}
        >
          {member.role === 'admin' ? 'Admin' : 'Membro'}
        </span>
      </div>

      {activeMeta?.pagina_fim && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 9 }}>
            <span>{pct >= 100 ? 'Meta concluída ✅' : pct < 30 && daysLeft !== null && daysLeft <= 3 ? 'Ficou para trás ⚠️' : 'Progresso na meta'}</span>
            <span style={{ color: 'rgba(240,235,248,.62)', fontWeight: 500 }}>
              pág. {member.pagina_atual || 0} / {activeMeta.pagina_fim} · {pct}%
            </span>
          </div>
          <div className="cl-mem-prog">
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: progColor(pct) }} />
          </div>
        </>
      )}

      {member.badges && member.badges.length > 0 && (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14 }}>
          {member.badges.map(b => (
            <BadgeChip key={b.tipo} badge={b} onClick={() => onBadgeClick && onBadgeClick(b)} />
          ))}
        </div>
      )}

      {showCutucar && (
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onCutucar && onCutucar(member)}
            style={{
              fontFamily: 'Figtree, sans-serif',
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--accent)',
              background: 'rgba(196,168,240,.14)',
              border: 'none',
              borderRadius: 8,
              padding: '3px 8px',
              cursor: 'pointer',
            }}
          >
            ⚡ Cutucar {(profile.full_name || profile.username || '').split(' ')[0]}
          </button>
        </div>
      )}
    </div>
  )
}

function BadgeChip({ badge, onClick }) {
  const styles = {
    fundador:         { bg: 'rgba(196,168,240,.14)', color: 'var(--accent)', border: 'rgba(196,168,240,.25)' },
    chama_viva:       { bg: 'rgba(255,107,53,.14)',  color: '#FF6B35',       border: 'rgba(255,107,53,.28)' },
    comentarista:     { bg: 'rgba(196,168,240,.14)', color: 'var(--accent)', border: 'rgba(196,168,240,.25)' },
    madrugador:       { bg: 'rgba(126,223,168,.13)', color: '#7EDFA8',       border: 'rgba(126,223,168,.25)' },
    leitor_relampago: { bg: 'rgba(255,209,102,.14)', color: '#FFD166',       border: 'rgba(255,209,102,.25)' },
    meta_coletiva:    { bg: 'rgba(255,209,102,.14)', color: '#FFD166',       border: 'rgba(255,209,102,.25)' },
  }
  const s = styles[badge.tipo] || styles.fundador

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: 10,
        border: `1px solid ${s.border}`,
        background: s.bg,
        color: s.color,
        cursor: 'pointer',
        fontFamily: 'Figtree, sans-serif',
      }}
    >
      {badge.icone} {badge.label}
    </button>
  )
}
