import { useState } from 'react'

const COVER_COLORS = ['c1','c2','c3','c4','c5','c6','c7','c8','c9']

function coverFallback(item) {
  const initials = item.title.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const cls = COVER_COLORS[item.title.charCodeAt(0) % COVER_COLORS.length]
  return { initials, cls }
}

export default function AddBookScreen({ collection, bookItems, onAddItem, onNavigate, onClose, onAdded }) {
  const [closing, setClosing] = useState(false)
  const [query, setQuery] = useState('')
  const [addingId, setAddingId] = useState(null)

  const existingIds = new Set((collection.collection_items || []).map(ci => ci.user_item_id))
  const available = bookItems.filter(ui => ui.items && !existingIds.has(ui.id))
  const term = query.trim().toLowerCase()
  const filtered = term
    ? available.filter(ui => {
        const it = ui.items
        return (it.title || '').toLowerCase().includes(term) || (it.author || '').toLowerCase().includes(term)
      })
    : available

  function handleBack() {
    setClosing(true)
    setTimeout(onClose, 300)
  }

  async function handleSelect(ui) {
    if (addingId) return
    setAddingId(ui.id)
    const { error } = await onAddItem(ui.id)
    setAddingId(null)
    if (!error) {
      onAdded?.()
      handleBack()
    }
  }

  return (
    <div className={`fs-push${closing ? ' fs-out' : ''}`}>
      <div className="fs-header">
        <div className="bk" onClick={handleBack}>←</div>
        <div className="fs-title-wrap">
          <div className="fs-title">Adicionar Livro</div>
        </div>
        <div className="fs-spacer" />
      </div>

      <div className="sc">
        <div
          onClick={() => onNavigate?.('s9')}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--sur)', border: '1px solid var(--bor)', borderRadius: 16,
            padding: 14, marginBottom: 22, cursor: 'pointer', backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ fontSize: 24, flexShrink: 0 }}>📎</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Subir meu próprio livro</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Cadastre um livro não encontrado na biblioteca</div>
          </div>
        </div>

        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>Escolher da biblioteca</div>
        <input
          className="bib-srch"
          placeholder="Buscar na sua biblioteca..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 12 }}>
            {available.length === 0 ? 'Todos os livros da sua biblioteca já estão nesta coleção' : 'Nenhum livro encontrado'}
          </div>
        ) : (
          filtered.map(ui => {
            const item = ui.items
            const { initials, cls } = coverFallback(item)
            return (
              <div key={ui.id} className="srr" style={{ cursor: 'default' }}>
                {item.cover_url ? (
                  <img className="srcov" src={item.cover_url} alt="" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className={`srcov ${cls}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 13 }}>{initials}</span>
                  </div>
                )}
                <div className="srm">
                  <div className="srt">{item.title}</div>
                  {item.author && <div className="sra">{item.author}</div>}
                </div>
                <button
                  onClick={() => handleSelect(ui)}
                  disabled={!!addingId}
                  style={{
                    padding: '8px 16px', borderRadius: 12, border: 'none',
                    background: 'var(--accent-g)', color: '#fff',
                    fontFamily: "'Figtree', sans-serif", fontSize: 12, fontWeight: 700,
                    cursor: addingId ? 'default' : 'pointer', opacity: addingId === ui.id ? 0.6 : 1, flexShrink: 0,
                  }}
                >
                  {addingId === ui.id ? '...' : 'Adicionar'}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
