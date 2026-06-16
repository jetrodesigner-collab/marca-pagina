import { useState } from 'react'

function getProgressBadge(pct, hasActiveMeta) {
  if (!hasActiveMeta) return null
  if (pct >= 100) return { tipo: 'dyn_meta_ok',      label: 'Meta Concluída',           icone: '✅' }
  if (pct >= 90)  return { tipo: 'dyn_relampago',    label: 'Leitor Relâmpago',          icone: '⚡' }
  if (pct >= 75)  return { tipo: 'dyn_em_chamas',    label: 'Em Chamas',                 icone: '🔥' }
  if (pct >= 60)  return { tipo: 'dyn_horizonte',    label: 'No Horizonte',              icone: '🌅' }
  if (pct >= 50)  return { tipo: 'dyn_no_ritmo',     label: 'No Ritmo',                  icone: '📖' }
  if (pct >= 30)  return { tipo: 'dyn_tartaruga',    label: 'Tartaruga Literária',       icone: '🐢' }
  if (pct >= 15)  return { tipo: 'dyn_soneca',       label: 'Soneca entre Capítulos',    icone: '😴' }
  if (pct >= 1)   return { tipo: 'dyn_capa',         label: 'Só Olhou a Capa',           icone: '👀' }
  return           { tipo: 'dyn_sofa',               label: 'Membro Honorário do Sofá',  icone: '🛋️' }
}

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

export default function MemberCard({ member, activeMeta, isAdmin, currentUserId, isPokedToday, onCutucar, onBadgeClick }) {
  const profile = member.profile || {}
  const name = profile.full_name || profile.username || 'Usuário'
  const initial = name.charAt(0).toUpperCase()
  const color = colorFor(member.user_id)
  const pct = member.pct || 0

  const showCutucar = activeMeta && pct < 50 && member.user_id !== currentUserId

  const dynBadge = getProgressBadge(pct, !!activeMeta?.pagina_fim)

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
            <span>{pct >= 100 ? 'Meta concluída ✅' : pct < 30 ? 'Ficou para trás ⚠️' : 'Progresso na meta'}</span>
            <span style={{ color: 'rgba(240,235,248,.62)', fontWeight: 500 }}>
              pág. {member.pagina_atual || 0} / {activeMeta.pagina_fim} · {pct}%
            </span>
          </div>
          <div className="cl-mem-prog">
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: progColor(pct) }} />
          </div>
        </>
      )}

      {(dynBadge || (member.badges && member.badges.length > 0)) && (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14 }}>
          {dynBadge && <BadgeChip key={dynBadge.tipo} badge={dynBadge} onClick={() => {}} dynamic />}
          {(member.badges || []).map(b => (
            <BadgeChip key={b.tipo} badge={b} onClick={() => onBadgeClick && onBadgeClick(b)} />
          ))}
        </div>
      )}

      {showCutucar && (
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => !isPokedToday && onCutucar && onCutucar(member)}
            disabled={isPokedToday}
            style={{
              fontFamily: 'Figtree, sans-serif',
              fontSize: 10,
              fontWeight: 600,
              color: isPokedToday ? 'var(--muted)' : 'var(--accent)',
              background: isPokedToday ? 'rgba(255,255,255,.05)' : 'rgba(196,168,240,.14)',
              border: 'none',
              borderRadius: 8,
              padding: '3px 8px',
              cursor: isPokedToday ? 'default' : 'pointer',
            }}
          >
            {isPokedToday ? '✓ Cutucado' : `⚡ Cutucar ${(profile.full_name || profile.username || '').split(' ')[0]}`}
          </button>
        </div>
      )}
    </div>
  )
}

function BadgeChip({ badge, onClick, dynamic }) {
  const styles = {
    // badges persistentes (DB)
    fundador:         { bg: 'rgba(196,168,240,.14)', color: 'var(--accent)', border: 'rgba(196,168,240,.25)' },
    chama_viva:       { bg: 'rgba(255,107,53,.14)',  color: '#FF6B35',       border: 'rgba(255,107,53,.28)' },
    comentarista:     { bg: 'rgba(196,168,240,.14)', color: 'var(--accent)', border: 'rgba(196,168,240,.25)' },
    madrugador:       { bg: 'rgba(126,223,168,.13)', color: '#7EDFA8',       border: 'rgba(126,223,168,.25)' },
    leitor_relampago: { bg: 'rgba(255,209,102,.14)', color: '#FFD166',       border: 'rgba(255,209,102,.25)' },
    meta_coletiva:    { bg: 'rgba(255,209,102,.14)', color: '#FFD166',       border: 'rgba(255,209,102,.25)' },
    pioneiro:         { bg: 'rgba(255,209,102,.18)', color: '#FFD166',       border: 'rgba(255,209,102,.35)' },
    // badges dinâmicos (computados por pct)
    dyn_meta_ok:      { bg: 'rgba(126,223,168,.13)', color: '#7EDFA8',       border: 'rgba(126,223,168,.28)' },
    dyn_relampago:    { bg: 'rgba(255,209,102,.14)', color: '#FFD166',       border: 'rgba(255,209,102,.28)' },
    dyn_em_chamas:    { bg: 'rgba(255,107,53,.13)',  color: '#FF6B35',       border: 'rgba(255,107,53,.25)' },
    dyn_horizonte:    { bg: 'rgba(196,168,240,.12)', color: 'var(--accent)', border: 'rgba(196,168,240,.22)' },
    dyn_no_ritmo:     { bg: 'rgba(196,168,240,.10)', color: 'var(--accent)', border: 'rgba(196,168,240,.18)' },
    dyn_tartaruga:    { bg: 'rgba(240,201,122,.10)', color: '#F0C97A',       border: 'rgba(240,201,122,.22)' },
    dyn_soneca:       { bg: 'rgba(240,201,122,.08)', color: '#D4A854',       border: 'rgba(240,201,122,.18)' },
    dyn_capa:         { bg: 'rgba(240,122,122,.08)', color: '#F07A7A',       border: 'rgba(240,122,122,.18)' },
    dyn_sofa:         { bg: 'rgba(240,122,122,.08)', color: '#C86060',       border: 'rgba(240,122,122,.16)' },
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
        cursor: dynamic ? 'default' : 'pointer',
        fontFamily: 'Figtree, sans-serif',
      }}
    >
      {badge.icone} {badge.label}
    </button>
  )
}
