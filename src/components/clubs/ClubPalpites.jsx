import { useState, useEffect, useRef } from 'react'
import { useClubPredictions } from '../../hooks/useClubPredictions'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `há ${days} dia${days > 1 ? 's' : ''}`
}

function avatarInitial(profile) {
  return ((profile?.full_name || profile?.username || '?').charAt(0)).toUpperCase()
}

export default function ClubPalpites({ clubId, activeMeta, currentUserId, isAdmin, onBack, onToast }) {
  const { predictions, loading, myPrediction, addPrediction, revealAll, markCorrect } =
    useClubPredictions(clubId, activeMeta?.id, currentUserId)

  const containerRef = useRef(null)
  const [showForm, setShowForm] = useState(false)
  const [formText, setFormText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    if (containerRef.current) containerRef.current.scrollTop = 0
  }, [])

  const allRevealed = predictions.length > 0 && predictions.every(p => p.revealed)

  const sorted = [...predictions].sort((a, b) => {
    const scoreA = a.revealed ? (a.correct ? 0 : 1) : 2
    const scoreB = b.revealed ? (b.correct ? 0 : 1) : 2
    return scoreA - scoreB
  })

  async function handleSubmit() {
    if (!formText.trim()) { onToast?.('Escreva seu palpite.'); return }
    setSubmitting(true)
    try {
      await addPrediction(formText.trim())
      setFormText('')
      setShowForm(false)
      onToast?.('🔮 Palpite registrado!')
    } catch {
      onToast?.('Erro ao salvar palpite.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReveal() {
    try {
      await revealAll()
      onToast?.('✨ Palpites revelados para todos!')
    } catch {
      onToast?.('Erro ao revelar.')
    }
  }

  return (
    <div ref={containerRef} style={{
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
          Palpites do Clube
        </div>
        <div style={{ minWidth: 60, display: 'flex', justifyContent: 'flex-end' }}>
          {isAdmin && predictions.length > 0 && !allRevealed && (
            <button
              onClick={handleReveal}
              style={{ fontSize: 10, fontWeight: 600, color: '#7EE8A2', background: 'rgba(126,232,162,.1)', border: '1px solid rgba(126,232,162,.25)', borderRadius: 6, padding: '4px 9px', cursor: 'pointer', fontFamily: 'Figtree, sans-serif' }}
            >
              Revelar todos
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 20px 48px', flex: 1 }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 12, color: 'var(--muted)' }}>Carregando...</div>
        )}

        {!loading && predictions.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: '56px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔮</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhum palpite ainda. Seja o primeiro!</div>
          </div>
        )}

        {!loading && sorted.map(p => {
          const isOwn = p.user_id === currentUserId
          const isBlurred = !isOwn && !p.revealed

          return (
            <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14 }}>
              <div className="cl-pred-ava">
                {p.profile?.avatar_url ? (
                  <img src={p.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                ) : avatarInitial(p.profile)}
              </div>
              <div className={`cl-pred-bubble${p.revealed && p.correct ? ' cl-pred-correct' : ''}`}>
                {p.revealed && (
                  <div className="cl-pred-rev-badge">✓ Revelado · Meta encerrada</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                    {isOwn ? 'Você' : (p.profile?.full_name || p.profile?.username || 'Membro')}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(90,84,104,1)' }}>{timeAgo(p.created_at)}</span>
                </div>
                <div style={{
                  fontSize: 13, lineHeight: 1.5, color: 'var(--text)',
                  filter: isBlurred ? 'blur(5px)' : 'none',
                  userSelect: isBlurred ? 'none' : 'auto',
                  transition: 'filter .3s',
                }}>
                  {p.content}
                </div>
                {isBlurred && (
                  <div style={{ fontSize: 10, color: 'rgba(90,84,104,1)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                    🔒 Revelado ao encerrar a meta
                  </div>
                )}
                {p.revealed && p.correct && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#FF8C42', background: 'rgba(255,140,66,.15)', borderRadius: 6, padding: '2px 7px' }}>
                      🏆 +50 pts
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>Acertou!</span>
                  </div>
                )}
                {p.revealed && !p.correct && isAdmin && (
                  <button
                    onClick={() => markCorrect(p.id)}
                    style={{ marginTop: 6, fontSize: 10, color: '#7EE8A2', background: 'rgba(126,232,162,.1)', border: '1px solid rgba(126,232,162,.25)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'Figtree, sans-serif' }}
                  >
                    ✓ Marcar como correto
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Prediction form */}
        {showForm && (
          <div style={{ marginBottom: 14, background: 'rgba(42,38,55,1)', border: '1px solid rgba(196,168,240,.12)', borderRadius: 10, padding: 12 }}>
            <textarea
              value={formText}
              onChange={e => setFormText(e.target.value)}
              placeholder="O que você acha que vai acontecer até o final desta meta?"
              rows={3}
              style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(196,168,240,.15)', borderRadius: 8, padding: '8px 10px', fontFamily: 'Figtree, sans-serif', fontSize: 13, color: 'var(--text)', resize: 'none', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowForm(false); setFormText('') }}
                style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: '1px solid rgba(196,168,240,.15)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'Figtree, sans-serif' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !formText.trim()}
                style={{ fontSize: 12, fontWeight: 600, color: '#1A1720', background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Figtree, sans-serif', opacity: submitting || !formText.trim() ? 0.6 : 1 }}
              >
                {submitting ? 'Salvando...' : 'Publicar palpite'}
              </button>
            </div>
          </div>
        )}

        {!myPrediction && !showForm && (
          <button onClick={() => setShowForm(true)} className="cl-pred-btn">
            🔮 Fazer meu palpite
          </button>
        )}
      </div>
    </div>
  )
}
