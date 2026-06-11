import { useState } from 'react'

const COVER_COLORS = ['c1','c2','c3','c4','c5','c6','c7','c8','c9']

function coverFallback(item) {
  const initials = item.title.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const cls = COVER_COLORS[item.title.charCodeAt(0) % COVER_COLORS.length]
  return { initials, cls }
}

function CollectionBookCard({ ci, onRemove, onClick }) {
  const [hover, setHover] = useState(false)
  const [imgErr, setImgErr] = useState(false)
  const item = ci.user_items?.items
  if (!item) return null
  const { initials, cls } = coverFallback(item)

  return (
    <div
      style={{ position: 'relative', cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      {item.cover_url && !imgErr ? (
        <img className="gcov" src={item.cover_url} alt="" style={{ objectFit: 'cover' }} onError={() => setImgErr(true)} />
      ) : (
        <div className={`gcov ${cls}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 13 }}>{initials}</span>
        </div>
      )}
      {hover && (
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          title="Remover da coleção"
          style={{
            position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%',
            background: '#E57373', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2,
          }}
        >✕</button>
      )}
    </div>
  )
}

function BookPicker({ bookItems, existingIds, adding, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const available = bookItems.filter(ui => ui.items && !existingIds.has(ui.id))
  const term = query.trim().toLowerCase()
  const filtered = term
    ? available.filter(ui => {
        const it = ui.items
        return (it.title || '').toLowerCase().includes(term) || (it.author || '').toLowerCase().includes(term)
      })
    : available

  return (
    <div className="shelf-overlay" style={{ zIndex: 110 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="shelf-sheet">
        <div className="modal-handle" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Adicionar livro</div>
          <button onClick={onClose} className="bk" style={{ width: 34, height: 34 }}>✕</button>
        </div>
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
          <div className="grid-h">
            {filtered.map(ui => {
              const item = ui.items
              const { initials, cls } = coverFallback(item)
              return (
                <div
                  key={ui.id}
                  className="gc"
                  onClick={() => { if (!adding) onSelect(ui) }}
                  style={{ opacity: adding ? 0.6 : 1, pointerEvents: adding ? 'none' : 'auto' }}
                >
                  {item.cover_url ? (
                    <img className="gcov" src={item.cover_url} alt="" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className={`gcov ${cls}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 13 }}>{initials}</span>
                    </div>
                  )}
                  <div className="gtit">{item.title}</div>
                  {item.author && <div className="gaut">{item.author}</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CollectionCard({ collection, bookItems, onRename, onDelete, onAddItem, onRemoveItem, onItemClick, onToast }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [nameValue, setNameValue] = useState(collection.name)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  const items = collection.collection_items || []
  const existingIds = new Set(items.map(ci => ci.user_item_id))

  function startEdit() {
    setNameValue(collection.name)
    setEditing(true)
  }

  function commitEdit() {
    setEditing(false)
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== collection.name) onRename(trimmed)
  }

  function handleDelete() {
    onDelete()
    onToast('Coleção removida')
  }

  async function handleSelectBook(ui) {
    setAdding(true)
    const { error } = await onAddItem(ui.id)
    setAdding(false)
    if (!error) {
      setPickerOpen(false)
      onToast('Livro adicionado à coleção')
    }
  }

  function handleItemClick(ci) {
    const ui = ci.user_items
    if (ui?.items) onItemClick(ui.items, ui)
  }

  return (
    <div style={{ background: 'var(--sur)', border: '1px solid var(--bor)', borderRadius: 16, padding: 14, marginBottom: 12, backdropFilter: 'blur(16px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>📚</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              className="finp"
              style={{ marginBottom: 0, padding: '6px 10px', fontSize: 13, fontWeight: 700 }}
              value={nameValue}
              autoFocus
              onChange={e => setNameValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
            />
          ) : (
            <div
              onClick={startEdit}
              style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {collection.name}
            </div>
          )}
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
            {items.length} {items.length === 1 ? 'livro' : 'livros'}
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 20,
            border: '1px solid rgba(196,168,240,0.35)', background: 'rgba(196,168,240,0.1)',
            color: 'var(--accent)', fontFamily: 'Figtree, sans-serif', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          {expanded ? 'Fechar ←' : 'Abrir →'}
        </button>
        <button
          onClick={handleDelete}
          title="Remover coleção"
          style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            border: '1px solid var(--bor)', background: 'var(--sur2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14,
          }}
        >🗑</button>
      </div>

      {expanded && (
        <div style={{ marginTop: 14 }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '14px 0', color: 'var(--muted)', fontSize: 11 }}>
              Nenhum livro nesta coleção ainda
            </div>
          ) : (
            <div className="grid-h" style={{ marginBottom: 10 }}>
              {items.map(ci => (
                <CollectionBookCard
                  key={ci.id}
                  ci={ci}
                  onRemove={() => onRemoveItem(ci.id)}
                  onClick={() => handleItemClick(ci)}
                />
              ))}
            </div>
          )}
          <button className="addt" style={{ marginBottom: 0 }} onClick={() => setPickerOpen(true)}>
            ＋ Adicionar livro
          </button>
        </div>
      )}

      {pickerOpen && (
        <BookPicker
          bookItems={bookItems}
          existingIds={existingIds}
          adding={adding}
          onSelect={handleSelectBook}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
