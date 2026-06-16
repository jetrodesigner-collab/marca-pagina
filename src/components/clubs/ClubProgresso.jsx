import MemberCard from './MemberCard'

export default function ClubProgresso({ members, activeMeta, clubId, currentUserId, onBadgeClick, onToast }) {
  const avgPct = members.length > 0
    ? Math.round(members.reduce((s, m) => s + (m.pct || 0), 0) / members.length)
    : 0

  function handleCutucar(member) {
    const name = (member.profile?.full_name || member.profile?.username || 'Membro').split(' ')[0]
    onToast && onToast(`⚡ ${name} foi cutucado!`)
  }

  return (
    <div style={{ padding: '28px 22px 120px' }}>
      <div className="cl-mood" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
          Progresso coletivo na meta
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>
            <span>Média do grupo</span>
            <span style={{ color: 'rgba(240,235,248,.62)', fontWeight: 500 }}>{avgPct}%</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${avgPct}%`, borderRadius: 3, background: 'linear-gradient(90deg,var(--accent),#9B7BD4)' }} />
          </div>
        </div>
      </div>

      {members.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--muted)' }}>
          Nenhum membro ainda.
        </div>
      )}

      {members.map(member => (
        <MemberCard
          key={member.user_id}
          member={member}
          activeMeta={activeMeta}
          isAdmin={member.role === 'admin'}
          onCutucar={handleCutucar}
          onBadgeClick={onBadgeClick}
        />
      ))}
    </div>
  )
}
