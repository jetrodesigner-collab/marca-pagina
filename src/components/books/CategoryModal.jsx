import { useState, useEffect } from 'react'
import { useCollections } from '../../hooks/useCollections'
import CollectionCard from './CollectionCard'

export default function CategoryModal({ category, meta, userId, bookItems, onItemClick, onClose }) {
  const {
    collections, loading,
    createCollection, renameCollection, deleteCollection,
    addItemToCollection, removeItemFromCollection,
  } = useCollections(userId, category)

  const [toast, setToast] = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const itemsInCategory = bookItems.filter(ui => ui.status === category)

  async function handleCreate() {
    setCreating(true)
    await createCollection()
    setCreating(false)
  }

  return (
    <div className="shelf-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="shelf-sheet">
        <div className="modal-handle" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div className={`dot ${meta.dotClass}`} style={{ width: 10, height: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{meta.label}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {itemsInCategory.length} {itemsInCategory.length === 1 ? 'livro' : 'livros'} · {collections.length} {collections.length === 1 ? 'coleção' : 'coleções'}
            </div>
          </div>
          <button onClick={onClose} className="bk" style={{ width: 34, height: 34, flexShrink: 0 }}>✕</button>
        </div>

        <button
          className="addt"
          onClick={handleCreate}
          disabled={creating}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: creating ? 0.6 : 1 }}
        >
          <span style={{ fontSize: 16 }}>＋</span> Criar nova coleção
        </button>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <div className="spin" />
          </div>
        ) : collections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 12 }}>
            Nenhuma coleção ainda
          </div>
        ) : (
          collections.map(col => (
            <CollectionCard
              key={col.id}
              collection={col}
              bookItems={bookItems}
              onRename={name => renameCollection(col.id, name)}
              onDelete={() => deleteCollection(col.id)}
              onAddItem={userItemId => addItemToCollection(col.id, userItemId)}
              onRemoveItem={collectionItemId => removeItemFromCollection(col.id, collectionItemId)}
              onItemClick={onItemClick}
              onToast={setToast}
            />
          ))
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
