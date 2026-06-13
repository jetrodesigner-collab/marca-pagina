import { useState, useEffect } from 'react'
import { useCollections } from '../../hooks/useCollections'
import CollectionCard from './CollectionCard'
import AddBookScreen from './AddBookScreen'

export default function CategoryModal({ category, meta, userId, bookItems, onItemClick, onClose, onNavigate, autoExpandCollectionId }) {
  const {
    collections, loading,
    createCollection, renameCollection, deleteCollection,
    addItemToCollection, removeItemFromCollection,
  } = useCollections(userId, category)

  const [toast, setToast] = useState(null)
  const [creating, setCreating] = useState(false)
  const [closing, setClosing] = useState(false)
  const [addBookCollection, setAddBookCollection] = useState(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const itemsInCategory = collections.reduce((sum, c) => sum + (c.collection_items?.length || 0), 0)

  async function handleCreate() {
    setCreating(true)
    await createCollection()
    setCreating(false)
  }

  function handleBack() {
    setClosing(true)
    setTimeout(onClose, 300)
  }

  if (addBookCollection) {
    return (
      <AddBookScreen
        collection={addBookCollection}
        bookItems={bookItems}
        onAddItem={userItemId => addItemToCollection(addBookCollection.id, userItemId)}
        onNavigate={onNavigate}
        onClose={() => setAddBookCollection(null)}
        onAdded={() => setToast('Livro adicionado à coleção')}
      />
    )
  }

  return (
    <div className={`fs-push${closing ? ' fs-out' : ''}`}>
      <div className="fs-header">
        <div className="bk" onClick={handleBack}>←</div>
        <div className="fs-title-wrap">
          <div className="fs-title">{meta.label}</div>
          <div className="fs-subtitle">
            {itemsInCategory} {itemsInCategory === 1 ? 'livro' : 'livros'} · {collections.length} {collections.length === 1 ? 'coleção' : 'coleções'}
          </div>
        </div>
        <div className="fs-spacer" />
      </div>

      <div className="sc">
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
              onRename={name => renameCollection(col.id, name)}
              onDelete={() => deleteCollection(col.id)}
              onAddItemRequest={() => setAddBookCollection(col)}
              onRemoveItem={collectionItemId => removeItemFromCollection(col.id, collectionItemId)}
              onItemClick={(item, userItem) => onItemClick(item, userItem, { category, collectionId: col.id })}
              onToast={setToast}
              forceExpanded={col.id === autoExpandCollectionId}
            />
          ))
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
