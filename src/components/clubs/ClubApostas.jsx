import { useState } from 'react'
import { useClubPageBets } from '../../hooks/useClubPageBets'

const MEMBER_COLORS = [
  { bg: 'rgba(196,168,240,.14)', color: '#C4A8F0' },
  { bg: 'rgba(126,223,168,.13)', color: '#7EDFA8' },
  { bg: 'rgba(240,201,122,.13)', color: '#F0C97A' },
]

function colorFor(id) {
  let h = 0
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) % MEMBER_COLORS.length
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length]
}

function avatarInitial(profile) {
  return ((profile?.full_name || profile?.username || '?').charAt(0)).toUpperCase()
}

export default function ClubApostas({ clubId, activeMeta, members, currentUserId, isAdmin, onBack, onToast }) {
  const { bets, loading, placeBet } = useClubPageBets(clubId, activeMeta?.id, currentUserId)
  const [showBetForm, setShowBetForm] = useState(false)
  const [betInput, setBetInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const hasActiveMeta = Boolean(activeMeta?.id)
  const pageEnd = activeMeta?.pagina_fim ?? null
  const myBet = bets.find(b => b.user_id === currentUserId)

  const memberMap = {}
  members.forEach(m => { memberMap[m.user_id] = m })

  const betCards = bets.map(b => {
    const member = memberMap[b.user_id]
    const currentPage = member?.pagina_atual || 0
    const pct = b.bet_pages > 0 ? Math.min(100, Math.round((currentPage / b.bet_pages) * 100)) : 0
    const fulfilled = currentPage >= b.bet_pages
    const isOver = activeMeta?.data_limite && new Date() > new Date(activeMeta.data_limite)
    const failed = isOver && !fulfilled
    const status = fulfilled ? 'success' : failed ? 'fail' : 'progress'
    return { ...b, member, currentPage, pct, status }
  })

  const withBets = betCards.length
  const fulfilledCount = betCards.filter(b => b.status === 'success').length
  const collectivePct = withBets > 0 ? Math.round((fulfilledCount / withBets) * 100) : 0
  const collectiveComplete = fulfilledCount === withBets && withBets > 0

  async function handlePlaceBet() {
    const pg = parseInt(betInput)
    if (!pg || pg <= 0 || (pageEnd && pg > pageEnd)) {
      onToast?.(pageEnd ? `Digite uma página entre 1 e ${pageEnd}.` : 'Digite um número de página válido.')
      return
    }
    setSubmitting(true)
    try {
      await placeBet(pg)
      setBetInput('')
      setShowBetForm(false)
      onToast?.('📊 Aposta registrada!')
    } catch {
      onToast?.('Erro ao registrar aposta.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      overflowY: 'auto', scrollbarWidth: 'none',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid var(--bor)',
        background: 'var(--sur)', position: 'sticky', top: 0, zIndex: 1,
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text)', fontFamily: 'Figtree, sans-serif',
            fontSize: 13, fontWeight: 600, padding: 0, minWidth: 60,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="10 4 6 8 10 12"/>
          </svg>
          Voltar
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em' }}>
          Apostas do Clube
        </div>
        <div style={{ minWidth: 60 }} />
      </div>

      {/* Content */}
      <div style={{ padding: '20px 20px 48px', flex: 1 }}>

        {/* No active meta */}
        {!hasActiveMeta && (
          <div style={{ textAlign: 'center', padding: '56px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Nenhuma meta ativa.<br />
              <span style={{ fontSize: 11, color: 'rgba(90,84,104,1)' }}>Crie uma meta para habilitar as apostas.</span>
            </div>
          </div>
        )}

        {hasActiveMeta && loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 12, color: 'var(--muted)' }}>Carregando...</div>
        )}

        {/* Empty state */}
        {hasActiveMeta && !loading && betCards.length === 0 && !showBetForm && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhuma aposta ainda. Seja o primeiro!</div>
          </div>
        )}

        {/* Bets grid */}
        {hasActiveMeta && !loading && betCards.length > 0 && (
          <div className="cl-bets-grid">
            {betCards.map(b => {
              const profile = b.member?.profile
              const uc = colorFor(b.user_id)
              const barColor = b.status === 'success' ? '#7EE8A2' : b.status === 'fail' ? '#FF6464' : 'var(--accent)'
              const barGlow = b.status === 'success' ? '0 0 6px rgba(126,232,162,.6)' : 'none'
              const borderColor = b.status === 'success'
                ? 'rgba(126,232,162,.3)'
                : b.status === 'fail'
                ? 'rgba(255,100,100,.2)'
                : 'rgba(196,168,240,.2)'
              const bgColor = b.status === 'success'
                ? 'rgba(126,232,162,.05)'
                : b.status === 'fail'
                ? 'rgba(255,100,100,.04)'
                : 'var(--sur2, rgba(42,38,55,1))'

              return (
                <div
                  key={b.id}
                  style={{
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: uc.bg, color: uc.color, flexShrink: 0, overflow: 'hidden' }}>
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      ) : avatarInitial(profile)}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.user_id === currentUserId ? 'Você' : (profile?.full_name || profile?.username || 'Membro')}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Apostou: {b.bet_pages} pág.</div>
                  <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, background: barColor, boxShadow: barGlow, width: `${b.pct}%`, transition: 'width 1s ease' }} />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: barColor }}>
                    {b.status === 'success' && `✓ Cumpriu · ${b.currentPage} pág.`}
                    {b.status === 'fail' && `✗ ${b.currentPage} pág. lidas`}
                    {b.status === 'progress' && `→ ${b.currentPage} de ${b.bet_pages} pág.`}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Bet CTA */}
        {hasActiveMeta && !myBet && !showBetForm && (
          <button
            onClick={() => setShowBetForm(true)}
            style={{
              width: '100%', padding: '11px',
              borderRadius: 10, border: '1.5px dashed rgba(196,168,240,.3)',
              background: 'rgba(196,168,240,.08)', color: 'var(--accent)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Figtree, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: betCards.length > 0 ? 10 : 0,
            }}
          >
            📊 Fazer minha aposta de páginas
          </button>
        )}

        {/* Bet form */}
        {hasActiveMeta && showBetForm && (
          <div style={{ marginTop: betCards.length > 0 ? 10 : 0, background: 'rgba(42,38,55,1)', border: '1px solid rgba(196,168,240,.12)', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
              {pageEnd
                ? `Até qual página você vai chegar nesta meta? (limite: pág. ${pageEnd})`
                : 'Até qual página você vai chegar nesta meta?'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                placeholder={pageEnd ? `Ex: ${Math.round(pageEnd * 0.7)}` : 'Ex: 150'}
                value={betInput}
                onChange={e => setBetInput(e.target.value)}
                min="1"
                max={pageEnd || undefined}
                style={{ flex: 1, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(196,168,240,.15)', borderRadius: 8, padding: '8px 10px', fontFamily: 'Figtree, sans-serif', fontSize: 13, color: 'var(--text)', outline: 'none' }}
              />
              <button
                onClick={() => { setShowBetForm(false); setBetInput('') }}
                style={{ fontSize: 13, color: 'var(--muted)', background: 'none', border: '1px solid rgba(196,168,240,.15)', borderRadius: 8, padding: '0 10px', cursor: 'pointer', fontFamily: 'Figtree, sans-serif' }}
              >
                ✕
              </button>
              <button
                onClick={handlePlaceBet}
                disabled={submitting || !betInput}
                style={{ fontSize: 12, fontWeight: 600, color: '#1A1720', background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'Figtree, sans-serif', opacity: submitting || !betInput ? 0.6 : 1 }}
              >
                {submitting ? '...' : 'Apostar'}
              </button>
            </div>
          </div>
        )}

        {/* Collective goal */}
        {hasActiveMeta && betCards.length > 0 && (
          <div style={{ marginTop: 16, background: 'linear-gradient(135deg, rgba(196,168,240,.1), rgba(126,232,162,.06))', border: '1px solid rgba(196,168,240,.2)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>🎯 Meta coletiva</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{collectivePct}%</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 6,
                background: 'linear-gradient(90deg, var(--accent), #7EE8A2)',
                boxShadow: '0 0 10px rgba(196,168,240,.4)',
                width: `${collectivePct}%`, transition: 'width 1.5s ease',
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {collectiveComplete
                ? 'Todos cumpriram a meta! 🎉'
                : `${fulfilledCount} de ${withBets} membros precisam cumprir para desbloquear`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(42,38,55,1)', borderRadius: 8, border: '1px solid rgba(196,168,240,.12)' }}>
              <span style={{ fontSize: 18 }}>{collectiveComplete ? '🔓' : '📖'}</span>
              <div>
                <strong style={{ color: '#FF8C42', fontWeight: 700, display: 'block', fontSize: 12 }}>
                  {collectiveComplete ? 'Curiosidade Secreta desbloqueada!' : 'Curiosidade Secreta'}
                </strong>
                {!collectiveComplete && (
                  <span style={{ color: 'var(--muted)', fontSize: 11 }}>Bastidores do livro no Almanaque</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
