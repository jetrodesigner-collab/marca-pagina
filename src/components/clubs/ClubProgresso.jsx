import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import MemberCard from './MemberCard'
import MetaColetivaCard from './MetaColetivaCard'

const PROGRESS_RULES = [
  { pct: '100%',   icone: '✅', label: 'Meta Concluída' },
  { pct: '90–99%', icone: '⚡', label: 'Leitor Relâmpago' },
  { pct: '75–89%', icone: '🔥', label: 'Chama Viva' },
  { pct: '60–74%', icone: '🌅', label: 'Madrugador' },
  { pct: '50–59%', icone: '📖', label: 'No Ritmo' },
  { pct: '30–49%', icone: '🐢', label: 'Tartaruga Literária' },
  { pct: '15–29%', icone: '😴', label: 'Soneca entre Capítulos' },
  { pct: '1–14%',  icone: '👀', label: 'Só Olhou a Capa' },
  { pct: '0%',     icone: '🛋️', label: 'Membro Honorário do Sofá' },
]

const RANK_RULES = [
  { medal: '🥇', label: '1º lugar — Medalha de Ouro' },
  { medal: '🥈', label: '2º lugar — Medalha de Prata' },
  { medal: '🥉', label: '3º lugar — Medalha de Bronze' },
]

const SPECIAL_RULES = [
  { icone: '👑', label: 'Fundador',  desc: 'Criador do clube' },
  { icone: '🏆', label: 'Pioneiro',  desc: 'Primeiro a atingir 100%' },
  { icone: '🔥', label: 'X dias',    desc: 'Dias consecutivos registrando progresso' },
]

function getProgressBadge(pct, hasActiveMeta) {
  if (!hasActiveMeta) return null
  if (pct >= 100) return { tipo: 'dyn_meta_ok',   label: 'Meta Concluída',          icone: '✅' }
  if (pct >= 90)  return { tipo: 'dyn_relampago', label: 'Leitor Relâmpago',         icone: '⚡' }
  if (pct >= 75)  return { tipo: 'dyn_em_chamas', label: 'Chama Viva',               icone: '🔥' }
  if (pct >= 60)  return { tipo: 'dyn_horizonte', label: 'Madrugador',               icone: '🌅' }
  if (pct >= 50)  return { tipo: 'dyn_no_ritmo',  label: 'No Ritmo',                 icone: '📖' }
  if (pct >= 30)  return { tipo: 'dyn_tartaruga', label: 'Tartaruga Literária',      icone: '🐢' }
  if (pct >= 15)  return { tipo: 'dyn_soneca',    label: 'Soneca entre Capítulos',   icone: '😴' }
  if (pct >= 1)   return { tipo: 'dyn_capa',      label: 'Só Olhou a Capa',          icone: '👀' }
  return           { tipo: 'dyn_sofa',            label: 'Membro Honorário do Sofá', icone: '🛋️' }
}

const BADGE_STYLES = {
  dyn_meta_ok:   { bg: 'rgba(126,223,168,.13)', color: '#7EDFA8',    border: 'rgba(126,223,168,.28)' },
  dyn_relampago: { bg: 'rgba(255,209,102,.14)', color: '#FFD166',    border: 'rgba(255,209,102,.28)' },
  dyn_em_chamas: { bg: 'rgba(255,107,53,.13)',  color: '#FF6B35',    border: 'rgba(255,107,53,.25)' },
  dyn_horizonte: { bg: 'rgba(196,168,240,.12)', color: '#C4A8F0',    border: 'rgba(196,168,240,.22)' },
  dyn_no_ritmo:  { bg: 'rgba(196,168,240,.10)', color: '#C4A8F0',    border: 'rgba(196,168,240,.18)' },
  dyn_tartaruga: { bg: 'rgba(240,201,122,.10)', color: '#F0C97A',    border: 'rgba(240,201,122,.22)' },
  dyn_soneca:    { bg: 'rgba(240,201,122,.08)', color: '#D4A854',    border: 'rgba(240,201,122,.18)' },
  dyn_capa:      { bg: 'rgba(240,122,122,.08)', color: '#F07A7A',    border: 'rgba(240,122,122,.18)' },
  dyn_sofa:      { bg: 'rgba(240,122,122,.08)', color: '#C86060',    border: 'rgba(240,122,122,.16)' },
}

export default function ClubProgresso({ members, activeMeta, clubId, currentUserId, profile, clubName, onUpdateProgress, onBadgeClick, onToast }) {
  const [pokedToday, setPokedToday] = useState(new Set())
  const [showRegras, setShowRegras] = useState(false)

  const avgPct = members.length > 0
    ? Math.round(members.reduce((s, m) => s + (m.pct || 0), 0) / members.length)
    : 0

  const myMember = members.find(m => m.user_id === currentUserId)
  const myPct = myMember?.pct || 0
  const myDynBadge = getProgressBadge(myPct, !!activeMeta?.pagina_fim)
  const myBadgeStyle = myDynBadge ? (BADGE_STYLES[myDynBadge.tipo] || BADGE_STYLES.dyn_sofa) : null

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

  const sectionLabel = {
    fontSize: 10, fontWeight: 700, letterSpacing: '1.1px',
    textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14,
    display: 'flex', alignItems: 'center', gap: 6,
  }

  return (
    <div style={{ padding: '28px 22px 120px' }}>

      {/* ──────────────────────────────────────────────── */}
      {/* SEÇÃO 1: REGRAS DE PREMIAÇÃO (fixo no topo)     */}
      {/* ──────────────────────────────────────────────── */}
      <div style={{ background: 'var(--sur)', border: '1px solid var(--bor)', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
        <button
          onClick={() => setShowRegras(v => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Figtree, sans-serif', fontSize: 12, fontWeight: 700, color: 'var(--text)',
          }}
        >
          <span>🏆 Regras de premiação</span>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{showRegras ? '▲' : '▼'}</span>
        </button>
        {showRegras && (
          <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--bor)' }}>
            <div style={{ paddingTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.9px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
                Badges por progresso
              </div>
              {PROGRESS_RULES.map(r => (
                <div key={r.pct} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{r.icone}</span>
                  <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600, flex: 1 }}>{r.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>{r.pct}</span>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--bor)', margin: '14px 0' }} />
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.9px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
                Medalhas de ranking
              </div>
              {RANK_RULES.map(r => (
                <div key={r.medal} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{r.medal}</span>
                  <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>{r.label}</span>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--bor)', margin: '14px 0' }} />
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.9px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
                Badges especiais
              </div>
              {SPECIAL_RULES.map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{r.icone}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{r.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────── */}
      {/* SEÇÃO 2: MEU PROGRESSO                          */}
      {/* ──────────────────────────────────────────────── */}
      <div style={sectionLabel}>
        <span>📍 Meu Progresso</span>
      </div>

      {myMember && activeMeta?.pagina_fim ? (
        <div style={{ background: 'rgba(196,168,240,.08)', border: '1px solid rgba(196,168,240,.18)', borderRadius: 14, padding: '18px 18px 16px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: myPct >= 100 ? '#7EDFA8' : myPct >= 60 ? 'var(--accent)' : myPct >= 30 ? '#F0C97A' : '#F07A7A' }}>
              {myPct}%
            </div>
            <button
              onClick={onUpdateProgress}
              style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'rgba(196,168,240,.14)', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontFamily: 'Figtree, sans-serif' }}
            >
              Atualizar página
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
            <span>Página atual</span>
            <span style={{ color: 'rgba(240,235,248,.7)', fontWeight: 500 }}>
              {myMember.pagina_atual || 0} / {activeMeta.pagina_fim}
            </span>
          </div>

          <div style={{ height: 8, background: 'rgba(255,255,255,.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{
              height: '100%', width: `${myPct}%`, borderRadius: 4,
              background: myPct >= 100 ? 'linear-gradient(90deg,#7EDFA8,#5BC894)' : 'linear-gradient(90deg,var(--accent),#9B7BD4)',
              transition: 'width .4s',
            }} />
          </div>

          {myDynBadge && myBadgeStyle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>Seu badge atual:</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
                border: `1px solid ${myBadgeStyle.border}`,
                background: myBadgeStyle.bg, color: myBadgeStyle.color,
              }}>
                {myDynBadge.icone} {myDynBadge.label}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--sur)', border: '1px solid var(--bor)', borderRadius: 14, padding: '20px', marginBottom: 24, textAlign: 'center' }}>
          {!activeMeta?.pagina_fim ? (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Nenhuma meta ativa. O admin precisa criar uma meta com total de páginas.
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                Você ainda não registrou seu progresso nesta meta.
              </div>
              <button
                onClick={onUpdateProgress}
                style={{ fontSize: 12, fontWeight: 600, color: '#1A1720', background: 'var(--accent)', border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontFamily: 'Figtree, sans-serif' }}
              >
                Registrar minha página
              </button>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* SEÇÃO 3: PROGRESSO COLETIVO                     */}
      {/* ──────────────────────────────────────────────── */}
      <div style={{ ...sectionLabel, marginBottom: 10 }}>
        <span>👥 Progresso Coletivo</span>
        <span style={{ fontSize: 10, color: 'rgba(240,235,248,.35)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
          {members.length} {members.length === 1 ? 'membro' : 'membros'}
        </span>
      </div>

      <div style={{ background: 'var(--sur)', border: '1px solid var(--bor)', borderRadius: 14, padding: '16px 18px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
          <span>Média do grupo</span>
          <span style={{ color: 'rgba(240,235,248,.62)', fontWeight: 600 }}>{avgPct}%</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${avgPct}%`, borderRadius: 3, background: 'linear-gradient(90deg,var(--accent),#9B7BD4)', transition: 'width .4s' }} />
        </div>
      </div>

      {/* ──────────────────────────────────────────────── */}
      {/* SEÇÃO 4: RANKING INDIVIDUAL DOS MEMBROS         */}
      {/* ──────────────────────────────────────────────── */}
      {members.length > 0 && members.map((member, idx) => (
        <MemberCard
          key={member.user_id}
          member={member}
          activeMeta={activeMeta}
          rank={idx}
          isAdmin={member.role === 'admin'}
          currentUserId={currentUserId}
          isPokedToday={pokedToday.has(member.user_id)}
          onCutucar={handleCutucar}
          onBadgeClick={onBadgeClick}
        />
      ))}

      {/* ──────────────────────────────────────────────── */}
      {/* SEÇÃO 5: META COLETIVA DO GRUPO                 */}
      {/* ──────────────────────────────────────────────── */}
      <MetaColetivaCard members={members} activeMeta={activeMeta} />

    </div>
  )
}
