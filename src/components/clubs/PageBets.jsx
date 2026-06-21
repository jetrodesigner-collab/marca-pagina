import { useState } from 'react'
import { useClubPageBets } from '../../hooks/useClubPageBets'

export default function PageBets({ clubId, activeMeta, members, currentUserId, isAdmin, onToast, onViewAll }) {
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
      onViewAll?.()
    } catch {
      onToast?.('Erro ao registrar aposta.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ background: 'var(--sur)', border: '1px solid var(--bor)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
        📊 Apostas de Páginas
      </div>

      {/* No active meta */}
      {!hasActiveMeta && (
        <div style={{ height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontSize: 24 }}>🎯</span>
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
            Nenhuma meta ativa.
            <br />
            <span style={{ fontSize: 11, color: 'rgba(90,84,104,1)' }}>Crie uma meta para habilitar as apostas.</span>
          </div>
        </div>
      )}

      {hasActiveMeta && loading && (
        <div style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 0', textAlign: 'center' }}>Carregando...</div>
      )}

      {/* Summary */}
      {hasActiveMeta && !loading && (
        <>
          {/* Stats row */}
          {betCards.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{betCards.length}</span>
                {betCards.length === 1 ? 'aposta registrada' : 'apostas registradas'}
                <span style={{ color: 'rgba(240,235,248,.25)' }}>·</span>
                <span style={{ color: '#7EE8A2', fontWeight: 600 }}>{collectivePct}%</span>
                <span>coletivo</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: 'linear-gradient(90deg, var(--accent), #7EE8A2)',
                  width: `${collectivePct}%`, transition: 'width 1s ease',
                }} />
              </div>
            </div>
          )}

          {/* Empty state */}
          {betCards.length === 0 && !showBetForm && (
            <div style={{ textAlign: 'center', padding: '12px 0 14px' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>📊</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Nenhuma aposta ainda. Seja o primeiro!</div>
            </div>
          )}

          {/* Bet form */}
          {showBetForm && (
            <div style={{ marginBottom: 12, background: 'rgba(42,38,55,1)', border: '1px solid rgba(196,168,240,.12)', borderRadius: 10, padding: 12 }}>
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

          {/* Bottom row */}
          {!showBetForm && (
            <div style={{ display: 'flex', gap: 8 }}>
              {!myBet && (
                <button
                  onClick={() => setShowBetForm(true)}
                  style={{
                    flex: 1, padding: '9px 12px', borderRadius: 10,
                    border: '1.5px dashed rgba(196,168,240,.3)',
                    background: 'rgba(196,168,240,.08)', color: 'var(--accent)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'Figtree, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  📊 Fazer minha aposta
                </button>
              )}
              <button
                onClick={onViewAll}
                style={{
                  flex: myBet ? 1 : 'none',
                  padding: '9px 14px', borderRadius: 10,
                  border: '1px solid rgba(196,168,240,.25)',
                  background: 'rgba(196,168,240,.06)', color: 'var(--accent)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'Figtree, sans-serif',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                Ver apostas 📊
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
