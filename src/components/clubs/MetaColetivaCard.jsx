import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { checkBadges } from '../../hooks/useBadges'

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

export default function MetaColetivaCard({ members, activeMeta, clubId, onBadgeUnlock }) {
  const [simulating, setSimulating] = useState(false)

  if (!activeMeta?.pagina_fim) return null

  const totalPct = members.length > 0
    ? members.reduce((sum, m) => sum + (m.pct || 0), 0) / members.length
    : 0

  const avgPct = Math.round(totalPct)
  const unlocked = avgPct >= 100

  const displayMembers = members.slice(0, 4)
  const extra = members.length - displayMembers.length

  const daysLeft = activeMeta?.data_limite
    ? Math.max(0, Math.ceil((new Date(activeMeta.data_limite) - new Date()) / (1000 * 60 * 60 * 24)))
    : null

  const motivacional = unlocked
    ? 'Todos concluíram! 🎉'
    : daysLeft !== null
      ? `Todos chegando juntos em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`
      : 'Todos chegando juntos'

  async function simularMeta() {
    if (simulating || !onBadgeUnlock) return
    setSimulating(true)
    for (const m of members) {
      await checkBadges(m.user_id, clubId, { meta: activeMeta })
    }
    await supabase
      .from('club_metas')
      .update({ ativa: false })
      .eq('id', activeMeta.id)
    onBadgeUnlock({ tipo: 'meta_coletiva', label: 'Meta Coletiva', icone: '🏆' })
    setSimulating(false)
  }

  return (
    <div className="cl-goal">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>🏆 Meta coletiva do grupo</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{motivacional}</div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>
          {avgPct}%
        </div>
      </div>

      <div className="cl-goal-bar">
        <div className="cl-goal-fill" style={{ width: `${avgPct}%` }} />
        <div className="cl-goal-milestone" style={{ left: '25%' }} />
        <div className="cl-goal-milestone" style={{ left: '50%' }} />
        <div className="cl-goal-milestone" style={{ left: '75%' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="cl-ava-stack">
          {displayMembers.map(m => {
            const c = colorFor(m.user_id)
            const profile = m.profile || {}
            const initial = (profile.full_name || profile.username || '?').charAt(0).toUpperCase()
            return (
              <div
                key={m.user_id}
                className="cl-ava"
                style={{ background: c.bg, color: c.color }}
                title={profile.full_name || profile.username}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                ) : initial}
              </div>
            )
          })}
          {extra > 0 && (
            <div className="cl-ava" style={{ background: 'rgba(255,255,255,.05)', color: 'var(--muted)' }}>
              +{extra}
            </div>
          )}
        </div>

        {unlocked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#FFD166', background: 'rgba(255,209,102,.14)', borderRadius: 8, padding: '3px 9px' }}>
            🏆 Card Dourado desbloqueado!
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: 'var(--muted)' }}>
            🔒 Card dourado ao atingir 100%
          </div>
        )}
      </div>

      {!unlocked && (
        <button
          onClick={simularMeta}
          disabled={simulating}
          style={{
            width: '100%',
            padding: '10px 0',
            background: 'rgba(196,168,240,.1)',
            border: '1px solid rgba(196,168,240,.22)',
            borderRadius: 10,
            fontFamily: 'Figtree, sans-serif',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--accent)',
            cursor: simulating ? 'default' : 'pointer',
            opacity: simulating ? .6 : 1,
          }}
        >
          {simulating ? '...' : '✨ Simular grupo chegando a 100%'}
        </button>
      )}
    </div>
  )
}
