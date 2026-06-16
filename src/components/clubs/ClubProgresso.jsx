import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import MemberCard from './MemberCard'

export default function ClubProgresso({ members, activeMeta, clubId, currentUserId, profile, clubName, onUpdateProgress, onBadgeClick, onToast }) {
  const [pokedToday, setPokedToday] = useState(new Set())

  const avgPct = members.length > 0
    ? Math.round(members.reduce((s, m) => s + (m.pct || 0), 0) / members.length)
    : 0

  const myMember = members.find(m => m.user_id === currentUserId)

  useEffect(() => {
    if (!currentUserId || !clubId) return
    loadPokedToday()
  }, [currentUserId, clubId])

  async function loadPokedToday() {
    const today = new Date().toISOString().slice(0, 10)
    try {
      const { data } = await supabase
        .from('club_pokes')
        .select('poked_id')
        .eq('club_id', clubId)
        .eq('poker_id', currentUserId)
        .gte('created_at', today + 'T00:00:00')
      setPokedToday(new Set((data || []).map(r => r.poked_id)))
    } catch {
      // tabela ainda não existe — migration pendente
    }
  }

  async function handleCutucar(member) {
    const memberId = member.user_id
    if (pokedToday.has(memberId)) return
    const pokerName = profile?.full_name || profile?.username || 'Alguém'
    const firstName = (member.profile?.full_name || member.profile?.username || 'Membro').split(' ')[0]
    try {
      await Promise.all([
        supabase.from('club_pokes').insert({ club_id: clubId, poker_id: currentUserId, poked_id: memberId }),
        supabase.from('notifications').insert({
          user_id: memberId,
          actor_id: currentUserId,
          type: 'cutucar',
          club_id: clubId,
          message: `${pokerName} te cutucou no clube "${clubName || 'clube'}"! Hora de voltar à leitura 📚`,
        }),
      ])
      setPokedToday(prev => new Set([...prev, memberId]))
      onToast && onToast(`⚡ ${firstName} foi cutucado!`)
    } catch {
      onToast && onToast('Erro ao cutucar.')
    }
  }

  return (
    <div style={{ padding: '28px 22px 120px' }}>

      {/* Card de progresso individual */}
      {myMember && activeMeta?.pagina_fim && (
        <div style={{ background: 'rgba(196,168,240,.08)', border: '1px solid rgba(196,168,240,.18)', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent)' }}>
              📍 Meu progresso
            </div>
            <button
              onClick={onUpdateProgress}
              style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'rgba(196,168,240,.14)', border: 'none', borderRadius: 8, padding: '3px 9px', cursor: 'pointer', fontFamily: 'Figtree, sans-serif' }}
            >
              Atualizar
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8 }}>
            <span style={{ color: 'var(--muted)' }}>pág. {myMember.pagina_atual || 0} / {activeMeta.pagina_fim}</span>
            <span style={{ fontWeight: 700, color: myMember.pct >= 100 ? '#7EDFA8' : myMember.pct >= 60 ? 'var(--accent)' : myMember.pct >= 30 ? '#F0C97A' : '#F07A7A' }}>
              {myMember.pct || 0}%
            </span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${myMember.pct || 0}%`, borderRadius: 3, background: myMember.pct >= 100 ? 'linear-gradient(90deg,#7EDFA8,#5BC894)' : 'linear-gradient(90deg,var(--accent),#9B7BD4)' }} />
          </div>
        </div>
      )}

      {/* Progresso coletivo */}
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
          currentUserId={currentUserId}
          isPokedToday={pokedToday.has(member.user_id)}
          onCutucar={handleCutucar}
          onBadgeClick={onBadgeClick}
        />
      ))}
    </div>
  )
}
