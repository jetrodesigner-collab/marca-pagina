import { useState, useEffect } from 'react'
import { useCollections } from '../../hooks/useCollections'
import CollectionCard from './CollectionCard'
import AddBookScreen from './AddBookScreen'

const COVER_COLORS = ['c1','c2','c3','c4','c5','c6','c7','c8','c9']

function StatusBookCard({ userItem, onClick }) {
  const [imgErr, setImgErr] = useState(false)
  const item = userItem.items
  if (!item) return null
  const initials = item.title.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const cls = COVER_COLORS[item.title.charCodeAt(0) % COVER_COLORS.length]
  return (
    <div style={{ cursor: 'pointer' }} onClick={onClick}>
      {item.cover_url && !imgErr ? (
        <img className="gcov" src={item.cover_url} alt="" style={{ objectFit: 'cover' }} onError={() => setImgErr(true)} />
      ) : (
        <div className={`gcov ${cls}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 13 }}>{initials}</span>
        </div>
      )}
    </div>
  )
}

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

  const booksInStatus = bookItems.filter(ui => ui.status === category)
  const itemsInCategory = booksInStatus.length

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
        {booksInStatus.length > 0 && (
          <div className="grid-h" style={{ marginBottom: 20 }}>
            {booksInStatus.map(ui => (
              <StatusBookCard
                key={ui.id}
                userItem={ui}
                onClick={() => onItemClick(ui.items, ui)}
              />
            ))}
          </div>
        )}

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
        ) : collections.length === 0 && booksInStatus.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 12 }}>
            Nenhum livro ainda
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
