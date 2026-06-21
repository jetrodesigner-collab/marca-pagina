import { useState } from 'react'
import { useClubPredictions } from '../../hooks/useClubPredictions'

export default function SecretPredictions({ clubId, activeMeta, currentUserId, isAdmin, onToast, onViewAll }) {
  const { predictions, loading, myPrediction, addPrediction, revealAll } =
    useClubPredictions(clubId, activeMeta?.id, currentUserId)

  const [showForm, setShowForm] = useState(false)
  const [formText, setFormText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const allRevealed = predictions.length > 0 && predictions.every(p => p.revealed)
  const revealedCount = predictions.filter(p => p.revealed).length
  const correctCount = predictions.filter(p => p.correct).length

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
    <div style={{ background: 'var(--sur)', border: '1px solid var(--bor)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          🔮 Palpites Secretos
        </div>
        {isAdmin && predictions.length > 0 && !allRevealed && (
          <button
            onClick={handleReveal}
            style={{ fontSize: 10, fontWeight: 600, color: '#7EE8A2', background: 'rgba(126,232,162,.1)', border: '1px solid rgba(126,232,162,.25)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'Figtree, sans-serif' }}
          >
            Revelar todos
          </button>
        )}
      </div>

      {loading && (
        <div style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 0', textAlign: 'center' }}>Carregando...</div>
      )}

      {/* Summary */}
      {!loading && predictions.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{predictions.length}</span>
          {predictions.length === 1 ? 'palpite registrado' : 'palpites registrados'}
          {revealedCount > 0 && <span style={{ color: 'rgba(240,235,248,.25)' }}>·</span>}
          {revealedCount > 0 && <span>{revealedCount} revelado{revealedCount > 1 ? 's' : ''}</span>}
          {correctCount > 0 && <span style={{ color: 'rgba(240,235,248,.25)' }}>·</span>}
          {correctCount > 0 && <span style={{ color: '#7EE8A2' }}>{correctCount} correto{correctCount > 1 ? 's' : ''}</span>}
        </div>
      )}

      {/* Empty state */}
      {!loading && predictions.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔮</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Nenhum palpite ainda. Seja o primeiro!</div>
        </div>
      )}

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

      {/* Bottom row */}
      {!showForm && (
        <div style={{ display: 'flex', gap: 8 }}>
          {!myPrediction && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 10,
                border: '1.5px dashed rgba(196,168,240,.3)',
                background: 'rgba(196,168,240,.08)', color: 'var(--accent)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Figtree, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              🔮 Fazer meu palpite
            </button>
          )}
          <button
            onClick={onViewAll}
            style={{
              flex: myPrediction ? 1 : 'none',
              padding: '9px 14px', borderRadius: 10,
              border: '1px solid rgba(196,168,240,.25)',
              background: 'rgba(196,168,240,.06)', color: 'var(--accent)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Figtree, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            Ver palpites 🔮
          </button>
        </div>
      )}
    </div>
  )
}
