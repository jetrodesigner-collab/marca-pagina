const STATUS_LABEL = { aberta: 'Aberta', encerrada: 'Encerrada', corrigida: 'Corrigida' }
const STATUS_STYLE = {
  aberta:    { color: '#7EE8A2', bg: 'rgba(126,232,162,.1)',  border: 'rgba(126,232,162,.25)' },
  encerrada: { color: '#F0C97A', bg: 'rgba(240,201,122,.1)',  border: 'rgba(240,201,122,.25)' },
  corrigida: { color: '#C4A8F0', bg: 'rgba(196,168,240,.1)',  border: 'rgba(196,168,240,.25)' },
}

function computeStatus(activity) {
  if (!activity) return null
  if (activity.status === 'corrigida') return 'corrigida'
  const isOpen = !activity.deadline || new Date() < new Date(activity.deadline)
  return isOpen ? 'aberta' : 'encerrada'
}

function deadlineText(deadline) {
  if (!deadline) return ''
  const now = new Date()
  const d = new Date(deadline)
  if (now > d) return `Encerrou em ${d.toLocaleDateString('pt-BR')}`
  const diff = d - now
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days} dia${days > 1 ? 's' : ''} restante${days > 1 ? 's' : ''}`
  if (hrs > 0) return `${hrs}h restante${hrs > 1 ? 's' : ''}`
  return 'Encerra em menos de 1h'
}

const inputStyle = {
  display: 'block', width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(196,168,240,.15)',
  borderRadius: 8, padding: '8px 10px', fontFamily: 'Figtree, sans-serif',
  fontSize: 12, color: 'var(--text)', outline: 'none',
}

export default function ClubAtividade({
  activity, loadingActivity, isAdmin, onViewAvaliacao, onCriarAvaliacao,
}) {
  const status = computeStatus(activity)
  const canCreate = isAdmin && (!activity || status !== 'aberta')

  if (!activity && !isAdmin) return null

  return (
    <div style={{ background: 'var(--sur)', border: '1px solid var(--bor)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          📝 Avaliação
        </div>
        {status && (
          <span style={{
            fontSize: 10, fontWeight: 600, borderRadius: 6, padding: '2px 8px',
            color: STATUS_STYLE[status].color,
            background: STATUS_STYLE[status].bg,
            border: `1px solid ${STATUS_STYLE[status].border}`,
          }}>
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>

      {loadingActivity && (
        <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>Carregando...</div>
      )}

      {/* No activity — admin only */}
      {!loadingActivity && !activity && isAdmin && (
        <div style={{ textAlign: 'center', padding: '14px 0' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Nenhuma avaliação criada ainda.</div>
          <button
            onClick={onCriarAvaliacao}
            style={{
              fontSize: 13, fontWeight: 600, color: '#1A1720', background: 'var(--accent)',
              border: 'none', borderRadius: 10, padding: '9px 20px', cursor: 'pointer',
              fontFamily: 'Figtree, sans-serif',
            }}
          >
            + Criar avaliação
          </button>
        </div>
      )}

      {/* Activity exists */}
      {!loadingActivity && activity && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>
            {activity.title}
          </div>
          {activity.deadline && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
              ⏰ {deadlineText(activity.deadline)}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onViewAvaliacao}
              style={{
                flex: 1, padding: '9px 14px', borderRadius: 10,
                border: '1px solid rgba(196,168,240,.25)',
                background: 'rgba(196,168,240,.08)', color: 'var(--accent)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Figtree, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              Ver avaliação →
            </button>
            {canCreate && (
              <button
                onClick={onCriarAvaliacao}
                style={{
                  padding: '9px 14px', borderRadius: 10,
                  border: '1.5px dashed rgba(196,168,240,.3)',
                  background: 'rgba(196,168,240,.06)', color: 'var(--accent)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'Figtree, sans-serif', whiteSpace: 'nowrap',
                }}
              >
                + Nova
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
