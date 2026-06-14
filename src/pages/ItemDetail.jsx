import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ReadingProgress from '../components/books/ReadingProgress'
import CommentThread from '../components/comments/CommentThread'

const COVER_COLORS = ['c1','c2','c3','c4','c5','c6','c7','c8','c9']
const FILM_COLORS  = ['f1','f2','f3','f4','f5','f6']

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

const STATUS_META = {
  want_to_read:  { label: 'Quero Ler',  badge: 'BQ', dot: 'DQ' },
  reading:       { label: 'Lendo',      badge: 'BL', dot: 'DL' },
  read:          { label: 'Lido',       badge: 'BD', dot: 'DD' },
  want_to_watch: { label: 'Quero Ver',  badge: 'BQ', dot: 'DQ' },
  watching:      { label: 'Assistindo', badge: 'BL', dot: 'DL' },
  watched:       { label: 'Assistido',  badge: 'BD', dot: 'DD' },
}

const BOOK_STATUSES  = ['want_to_read', 'reading', 'read']
const MOVIE_STATUSES = ['want_to_watch', 'watching', 'watched']
const RATING_DESCS   = ['', 'Hm...', 'Ok', 'Bom', 'Muito bom', 'Incrível!']

function HeroCover({ item }) {
  const [err, setErr] = useState(false)
  if (item.cover_url && !err) {
    return (
      <img
        className="hcov"
        src={item.cover_url}
        alt=""
        style={{ objectFit: 'cover' }}
        onError={() => setErr(true)}
      />
    )
  }
  const initials = item.title.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const colors   = item.type === 'movie' ? FILM_COLORS : COVER_COLORS
  const cls      = colors[item.title.charCodeAt(0) % colors.length]
  return (
    <div className={`hcov ${cls}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 18 }}>{initials}</span>
    </div>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E57373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function TrashIconSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--muted)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--muted)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function formatExcerptDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ItemDetail({ session, item: itemProp, userItem: userItemProp, isOwner = true, onBack, onUserItemUpdate, onNavigate, initialTab = 'R' }) {
  const [theme]        = useState(() => localStorage.getItem('tema') || 'D')
  const [activeTab,    setActiveTab]    = useState(initialTab)
  const [localItem,    setLocalItem]    = useState(itemProp)
  const [localUserItem, setLocalUserItem] = useState(userItemProp)
  const [status,       setStatus]       = useState(userItemProp?.status ?? null)
  const [rating,       setRating]       = useState(userItemProp?.rating || 0)
  const [review,       setReview]       = useState('')
  const [isPublic,     setIsPublic]     = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [savedReview,  setSavedReview]  = useState(null)
  const [reviewExpanded, setReviewExpanded] = useState(false)
  const [deleteReviewConfirm, setDeleteReviewConfirm] = useState(false)
  const [toast,        setToast]        = useState(null)
  const [adding,       setAdding]       = useState(false)
  const [addError,     setAddError]     = useState(false)
  const [synopsis,     setSynopsis]     = useState(() => localItem.overview || localItem.synopsis || null)
  const [synExpanded,  setSynExpanded]  = useState(false)
  const [synNeedsBtn,  setSynNeedsBtn]  = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [removing,     setRemoving]     = useState(false)
  const [showDeleteBookModal, setShowDeleteBookModal] = useState(false)
  const [deletingBook, setDeletingBook] = useState(false)
  const [excerpts,        setExcerpts]        = useState([])
  const [communityExcerpts, setCommunityExcerpts] = useState([])
  const [showExcerptForm, setShowExcerptForm] = useState(false)
  const [excerptText,  setExcerptText]  = useState('')
  const [excerptPage,  setExcerptPage]  = useState('')
  const [excerptPublic, setExcerptPublic] = useState(false)
  const [savingExcerpt, setSavingExcerpt] = useState(false)
  const [editingExcerptId, setEditingExcerptId] = useState(null)
  const [expandedExcerptId, setExpandedExcerptId] = useState(null)
  const synRef = useRef(null)
  const reviewRef = useRef(null)

  const isBook       = localItem.type === 'book'
  const themeClass   = theme === 'L' ? 'light' : 'dark'
  const statuses     = isBook ? BOOK_STATUSES : MOVIE_STATUSES
  const isInLibrary  = !!localUserItem
  const statusInfo   = status ? STATUS_META[status] : null
  const showTrash    = isOwner && isInLibrary
  const canDeleteBook = localItem.is_manual && localItem.created_by === session.user.id
  const reviewDirty  = review !== (savedReview?.body || '')

  // Load existing review only when item has a Supabase UUID and is in library
  useEffect(() => {
    if (!localItem.id || !localUserItem) return
    supabase
      .from('reviews')
      .select('body, is_public')
      .eq('user_id', session.user.id)
      .eq('item_id', localItem.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.body) {
          setReview(data.body || '')
          setIsPublic(data.is_public || false)
          setSavedReview(data)
        }
      })
  }, [localItem.id, localUserItem?.id, session.user.id])

  // Some o toast automaticamente após alguns segundos
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  // Expande/recolhe a caixa de resenha
  useEffect(() => {
    const el = reviewRef.current
    if (!el) return
    if (reviewExpanded) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    } else {
      el.style.height = '144px'
    }
  }, [reviewExpanded, review])

  // Carrega trechos (próprios + comunidade) quando o item está na biblioteca
  useEffect(() => {
    if (!localItem.id || !localUserItem || !isBook) return
    loadExcerpts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localItem.id, localUserItem?.id, isBook])

  // Busca sinopse da API quando não veio no item
  useEffect(() => {
    if (synopsis || !localItem.api_id) return
    if (isBook) {
      fetch(`https://openlibrary.org${localItem.api_id}.json`)
        .then(r => r.json())
        .then(data => {
          const raw = data.description
          const text = typeof raw === 'string' ? raw : (raw?.value ?? null)
          setSynopsis(text || null)
        })
        .catch(() => {})
    } else {
      const key = import.meta.env.VITE_TMDB_API_KEY
      fetch(`https://api.themoviedb.org/3/movie/${localItem.api_id}?api_key=${key}&language=pt-BR`)
        .then(r => r.json())
        .then(data => setSynopsis(data.overview || null))
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Detecta se o texto está de fato sendo truncado (para mostrar/esconder o botão)
  useEffect(() => {
    if (!synopsis || !synRef.current || synExpanded) return
    setSynNeedsBtn(synRef.current.scrollHeight > synRef.current.clientHeight + 1)
  }, [synopsis, synExpanded])

  async function addToLibrary(chosenStatus) {
    if (adding) return
    setAdding(true)
    setAddError(false)
    try {
      const { data: itemRow, error: itemErr } = await supabase
        .from('items')
        .upsert({
          type:       localItem.type,
          api_id:     localItem.api_id,
          title:      localItem.title,
          author:     localItem.author     || null,
          director:   localItem.director   || null,
          year:       localItem.year       || null,
          cover_url:  localItem.cover_url  || null,
          api_source: localItem.api_source || null,
        }, { onConflict: 'type,api_id' })
        .select()
        .single()

      if (itemErr || !itemRow) throw itemErr || new Error('no item row')

      const { data: uiRow, error: uiErr } = await supabase
        .from('user_items')
        .insert({ user_id: session.user.id, item_id: itemRow.id, status: chosenStatus })
        .select()
        .single()

      if (uiErr || !uiRow) throw uiErr || new Error('no ui row')

      setLocalItem(itemRow)
      setLocalUserItem(uiRow)
      setStatus(uiRow.status)
      onUserItemUpdate?.({ ...uiRow })
    } catch {
      setAddError(true)
      setTimeout(() => setAddError(false), 2500)
    } finally {
      setAdding(false)
    }
  }

  async function changeStatus(newStatus) {
    if (!localUserItem || newStatus === status) return
    const prev = status
    setStatus(newStatus)
    const { error } = await supabase
      .from('user_items')
      .update({ status: newStatus })
      .eq('id', localUserItem.id)
    if (error) {
      setStatus(prev)
    } else {
      onUserItemUpdate?.({ ...localUserItem, status: newStatus, rating })
    }
  }

  async function changeRating(stars) {
    if (!localUserItem) return
    const newRating = rating === stars ? 0 : stars
    setRating(newRating)
    await supabase
      .from('user_items')
      .update({ rating: newRating || null })
      .eq('id', localUserItem.id)
    onUserItemUpdate?.({ ...localUserItem, status, rating: newRating })
  }

  async function saveReview() {
    if (saving || !localItem.id) return
    setSaving(true)

    if (!review.trim() && savedReview) {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('user_id', session.user.id)
        .eq('item_id', localItem.id)
      setSaving(false)
      if (!error) {
        setSavedReview(null)
        setReview('')
        setReviewExpanded(false)
        setToast('Resenha excluída')
      } else {
        setToast('Erro ao salvar resenha')
      }
      return
    }

    const { error } = await supabase
      .from('reviews')
      .upsert(
        { user_id: session.user.id, item_id: localItem.id, body: review, is_public: isPublic, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,item_id' }
      )
    setSaving(false)
    if (!error) {
      setSavedReview({ body: review, is_public: isPublic })
      setReviewExpanded(false)
      setToast('Resenha salva')
    } else {
      setToast('Erro ao salvar resenha')
    }
  }

  function cancelReview() {
    setReview(savedReview?.body || '')
    setReviewExpanded(false)
  }

  async function setReviewPrivacy(newPublic) {
    if (!savedReview || savedReview.is_public === newPublic) return
    const { error } = await supabase
      .from('reviews')
      .update({ is_public: newPublic })
      .eq('user_id', session.user.id)
      .eq('item_id', localItem.id)
    if (!error) {
      setSavedReview(prev => ({ ...prev, is_public: newPublic }))
      setIsPublic(newPublic)
      setToast(newPublic ? 'Resenha agora é pública' : 'Resenha agora é privada')
    }
  }

  function handlePrivacyClick(newPublic) {
    if (savedReview) {
      setReviewPrivacy(newPublic)
    } else {
      setIsPublic(newPublic)
    }
  }

  async function confirmDeleteReview() {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('user_id', session.user.id)
      .eq('item_id', localItem.id)
    if (!error) {
      setSavedReview(null)
      setReview('')
      setIsPublic(false)
      setDeleteReviewConfirm(false)
      setReviewExpanded(false)
      setToast('Resenha excluída')
    }
  }

  async function loadExcerpts() {
    const [{ data: mine }, { data: community }] = await Promise.all([
      supabase
        .from('excerpts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('item_id', localItem.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('excerpts')
        .select('*')
        .eq('item_id', localItem.id)
        .eq('is_public', true)
        .neq('user_id', session.user.id)
        .order('created_at', { ascending: false }),
    ])
    setExcerpts(mine || [])
    setCommunityExcerpts(community || [])
  }

  function cancelExcerptForm() {
    setShowExcerptForm(false)
    setExcerptText('')
    setExcerptPage('')
    setExcerptPublic(false)
    setEditingExcerptId(null)
  }

  function openNewExcerptForm() {
    setEditingExcerptId(null)
    setExcerptText('')
    setExcerptPage('')
    setExcerptPublic(false)
    setShowExcerptForm(true)
  }

  function openEditExcerptForm(excerpt) {
    setEditingExcerptId(excerpt.id)
    setExcerptText(excerpt.content)
    setExcerptPage(excerpt.page_number ? String(excerpt.page_number) : '')
    setExcerptPublic(excerpt.is_public)
    setShowExcerptForm(true)
  }

  async function saveExcerpt() {
    if (savingExcerpt || !excerptText.trim() || !localItem.id) return
    setSavingExcerpt(true)
    const payload = {
      content:     excerptText.trim(),
      page_number: excerptPage ? Number(excerptPage) : null,
      is_public:   excerptPublic,
    }
    const { error } = editingExcerptId
      ? await supabase.from('excerpts')
          .update(payload)
          .eq('id', editingExcerptId)
          .eq('user_id', session.user.id)
      : await supabase.from('excerpts').insert({
          user_id: session.user.id,
          item_id: localItem.id,
          ...payload,
        })
    setSavingExcerpt(false)
    if (!error) {
      cancelExcerptForm()
      loadExcerpts()
    }
  }

  async function toggleExcerptPrivacy(excerpt) {
    const { error } = await supabase
      .from('excerpts')
      .update({ is_public: !excerpt.is_public })
      .eq('id', excerpt.id)
      .eq('user_id', session.user.id)
    if (!error) {
      setExcerpts(prev => prev.map(e => e.id === excerpt.id ? { ...e, is_public: !e.is_public } : e))
    }
  }

  async function deleteExcerpt(id) {
    if (!window.confirm('Excluir este trecho?')) return
    const { error } = await supabase.from('excerpts').delete()
      .eq('id', id)
      .eq('user_id', session.user.id)
    if (!error) {
      setExcerpts(prev => prev.filter(e => e.id !== id))
    }
  }

  async function removeFromLibrary() {
    if (!localItem.id || removing) return
    setRemoving(true)
    try {
      await supabase.from('user_items').delete()
        .eq('user_id', session.user.id)
        .eq('item_id', localItem.id)
      await supabase.from('reviews').delete()
        .eq('user_id', session.user.id)
        .eq('item_id', localItem.id)
      if (isBook) {
        // excerpts table may not exist yet — ignore errors
        await supabase.from('excerpts').delete()
          .eq('user_id', session.user.id)
          .eq('item_id', localItem.id)
          .then(() => {}).catch(() => {})
      }
      onBack()
    } catch {
      setRemoving(false)
      setShowRemoveModal(false)
    }
  }

  async function deleteBookPermanently() {
    if (!localItem.id || deletingBook) return
    setDeletingBook(true)
    const { error } = await supabase.from('items').delete().eq('id', localItem.id)
    if (!error) {
      setShowDeleteBookModal(false)
      setToast('Livro excluído.')
      setTimeout(() => onBack(), 900)
    } else {
      setDeletingBook(false)
      setShowDeleteBookModal(false)
      setToast('Erro ao excluir livro.')
    }
  }

  return (
    <div
      className={themeClass}
      style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
    >
      {BLOBS.map((b, i) => (
        <div key={i} style={{ position: 'fixed', borderRadius: '50%', filter: 'blur(55px)', pointerEvents: 'none', zIndex: 0, ...b }} />
      ))}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* Page header */}
        <div className="ph">
          <div className="bk" onClick={onBack}>←</div>
          <div className="ph-t" style={{ flex: 1 }}>{isBook ? 'Detalhes do Livro' : 'Detalhes do Filme'}</div>
          {showTrash && (
            <div
              onClick={() => setShowRemoveModal(true)}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'rgba(229,115,115,0.12)', border: '1px solid rgba(229,115,115,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, transition: 'background .2s',
              }}
            >
              <TrashIcon />
            </div>
          )}
        </div>

        <div className="gl" />

        {/* Scroll area */}
        <div className="sc">

          {/* Hero */}
          <div className="hero">
            <HeroCover item={localItem} />
            <div className="hm" style={{ justifyContent: synopsis ? 'flex-start' : 'center' }}>
              <div className="ht">{localItem.title}</div>
              {localItem.author   && <div className="hs">{localItem.author}</div>}
              {localItem.director && <div className="hs">Dir. {localItem.director}</div>}
              {localItem.year     && <div className="hy">{localItem.year}</div>}

              {localItem.is_manual && localItem.status === 'pending' && localItem.created_by === session.user.id && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start',
                  fontSize: 9, fontWeight: 800, color: '#F59E0B',
                  background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)',
                  borderRadius: 20, padding: '3px 9px', marginTop: 6, letterSpacing: '0.04em',
                }}>
                  ⏳ Pendente
                </div>
              )}

              {synopsis && (
                <div style={{ marginTop: 2 }}>
                  <div
                    ref={synRef}
                    style={{
                      fontSize: 10,
                      color: 'var(--text2)',
                      lineHeight: 1.55,
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      ...(synExpanded ? {} : {
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }),
                    }}
                  >
                    {synopsis}
                  </div>
                  {(synNeedsBtn || synExpanded) && (
                    <button
                      onClick={() => setSynExpanded(e => !e)}
                      style={{
                        fontSize: 9, fontWeight: 700, color: 'var(--accent)',
                        background: 'none', border: 'none', padding: '3px 0 0',
                        cursor: 'pointer', fontFamily: "'Figtree', sans-serif",
                        display: 'block',
                      }}
                    >
                      {synExpanded ? 'Ver menos ↑' : 'Ver mais ↓'}
                    </button>
                  )}
                </div>
              )}

              {isInLibrary && statusInfo && (
                <div className="tags" style={{ marginTop: 6 }}>
                  <span className={`sb ${statusInfo.badge}`}>
                    <div className={`dot ${statusInfo.dot}`} />
                    {statusInfo.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          {canDeleteBook && (
            <button
              onClick={() => setShowDeleteBookModal(true)}
              style={{
                width: '100%', padding: 10, marginBottom: 14,
                background: 'rgba(192,80,80,.12)', border: '1.5px solid rgba(192,80,80,.35)',
                borderRadius: 14, color: 'var(--red)', fontFamily: "'Figtree', sans-serif",
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              🗑 Excluir livro
            </button>
          )}

          {/* ── Not in library: add to library ── */}
          {!isInLibrary && (
            <div style={{ marginBottom: 14 }}>
              <div className="bl">Adicionar à biblioteca</div>
              <div className="sts-row">
                {statuses.map(s => (
                  <button
                    key={s}
                    className="sts-btn"
                    onClick={() => addToLibrary(s)}
                    disabled={adding}
                    style={{ opacity: adding ? 0.6 : 1 }}
                  >
                    {adding ? '…' : STATUS_META[s].label}
                  </button>
                ))}
              </div>
              {addError && (
                <div style={{ fontSize: 11, color: '#E07878', textAlign: 'center', marginTop: 6 }}>
                  Erro ao adicionar. Tente novamente.
                </div>
              )}
            </div>
          )}

          {/* ── In library: status + rating + tabs ── */}
          {isInLibrary && (
            <>
              {/* Status buttons */}
              <div className="sts-row" style={{ marginBottom: 14 }}>
                {statuses.map(s => (
                  <button
                    key={s}
                    className={`sts-btn${status === s ? ' on' : ''}`}
                    onClick={() => changeStatus(s)}
                  >
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>

              {/* Progresso de leitura (apenas livros em "Lendo") */}
              {isBook && status === 'reading' && (
                <ReadingProgress session={session} itemId={localItem.id} />
              )}

              {/* Rating */}
              <div className="nota-card">
                <div>
                  <div className="nota-lbl">Sua nota</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                    <div className="nota-val">{rating > 0 ? `${rating}.0` : '—'}</div>
                    {rating > 0 && <div style={{ fontSize: 11, color: 'var(--muted)' }}>/5</div>}
                  </div>
                  <div className="nota-desc">{RATING_DESCS[rating] || 'Toque para avaliar'}</div>
                </div>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map(n => (
                    <span key={n} className={`star${rating >= n ? ' on' : ''}`} onClick={() => changeRating(n)}>★</span>
                  ))}
                </div>
              </div>

              {/* Inner tabs */}
              <div className="itabs">
                <div className={`it${activeTab === 'R' ? ' on' : ''}`} onClick={() => setActiveTab('R')}>✍️ Resenha</div>
                {isBook && (
                  <div className={`it${activeTab === 'T' ? ' on' : ''}`} onClick={() => setActiveTab('T')}>💬 Trechos</div>
                )}
                <div className={`it${activeTab === 'C' ? ' on' : ''}`} onClick={() => setActiveTab('C')}>👥 Comunidade</div>
              </div>

              {/* Resenha */}
              {activeTab === 'R' && (
                <div>
                  <div className="bl">Sua resenha pessoal</div>

                  <div className="rbox">
                    <textarea
                      ref={reviewRef}
                      className="rtxt"
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', overflowY: 'auto', height: 144, fontSize: 16, fontFamily: "'Figtree', sans-serif", lineHeight: 1.6 }}
                      placeholder={`Escreva o que esse ${isBook ? 'livro' : 'filme'} representou para você...`}
                      value={review}
                      onChange={e => setReview(e.target.value)}
                    />
                  </div>

                  <div className="rev-actions">
                    <button className={`ra${reviewExpanded ? ' on' : ''}`} onClick={() => setReviewExpanded(e => !e)}>
                      <span className="ico">👁️</span> ver resenha
                    </button>
                    <button className="ra" onClick={() => { setReviewExpanded(true); reviewRef.current?.focus() }}>
                      <span className="ico">✏️</span> editar
                    </button>
                    <button className={`ra${reviewDirty ? ' on' : ''}`} onClick={saveReview} disabled={!reviewDirty || saving}>
                      <span className="ico">💾</span> salvar
                    </button>
                    <button className="ra" onClick={cancelReview} disabled={!reviewDirty}>
                      <span className="ico">↩️</span> cancelar
                    </button>
                    <button className="ra danger" onClick={() => setDeleteReviewConfirm(true)} disabled={!savedReview}>
                      <span className="ico">🗑️</span> excluir
                    </button>
                  </div>

                  {deleteReviewConfirm && (
                    <div className="del-confirm">
                      <span>Tem certeza?</span>
                      <div className="del-confirm-actions">
                        <button className="confirm" onClick={confirmDeleteReview}>Confirmar</button>
                        <button className="cancel" onClick={() => setDeleteReviewConfirm(false)}>Cancelar</button>
                      </div>
                    </div>
                  )}

                  <div className="bl">Privacidade</div>
                  <div className="priv">
                    <button className={`pb${!isPublic ? ' on' : ''}`} onClick={() => handlePrivacyClick(false)}>🔒 Privado</button>
                    <button className={`pb${isPublic  ? ' on' : ''}`} onClick={() => handlePrivacyClick(true)}>🌐 Público</button>
                  </div>
                </div>
              )}

              {/* Trechos (livros) */}
              {activeTab === 'T' && (
                <div>
                  <button className="addt" onClick={openNewExcerptForm}>＋ Adicionar trecho</button>

                  {showExcerptForm && (
                    <div className="rbox">
                      <textarea
                        className="rtxt"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', minHeight: 144, fontSize: 16, fontFamily: "'Figtree', sans-serif", lineHeight: 1.6, fontStyle: 'italic', marginBottom: 12 }}
                        placeholder="Digite o trecho..."
                        value={excerptText}
                        onChange={e => setExcerptText(e.target.value)}
                      />
                      <div className="bl">Página</div>
                      <input
                        type="number"
                        className="finp"
                        style={{ width: 100 }}
                        placeholder="Nº"
                        value={excerptPage}
                        onChange={e => setExcerptPage(e.target.value)}
                      />
                      <div className="bl">Privacidade</div>
                      <div className="priv">
                        <button className={`pb${!excerptPublic ? ' on' : ''}`} onClick={() => setExcerptPublic(false)}>🔒 Privado</button>
                        <button className={`pb${excerptPublic ? ' on' : ''}`} onClick={() => setExcerptPublic(true)}>🌐 Público</button>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={cancelExcerptForm}
                          style={{
                            flex: 1, padding: '12px 0', borderRadius: 14,
                            border: '1px solid var(--bor2)', background: 'var(--sur)',
                            color: 'var(--text)', fontFamily: "'Figtree', sans-serif",
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                        <button className="savebtn" style={{ flex: 1 }} onClick={saveExcerpt} disabled={savingExcerpt || !excerptText.trim()}>
                          {savingExcerpt ? 'Salvando...' : editingExcerptId ? 'Salvar alterações' : 'Salvar trecho'}
                        </button>
                      </div>
                    </div>
                  )}

                  {excerpts.length === 0 && communityExcerpts.length === 0 && !showExcerptForm && (
                    <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--muted)' }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>Nenhum trecho ainda</div>
                      <div style={{ fontSize: 11, lineHeight: 1.55 }}>Salve suas passagens favoritas</div>
                    </div>
                  )}

                  {excerpts.map(ex => {
                    const isExpanded = expandedExcerptId === ex.id
                    return (
                      <div className="tcrd" key={ex.id}>
                        <div
                          className="ttxt"
                          style={isExpanded ? {} : {
                            display: '-webkit-box',
                            WebkitLineClamp: 8,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          "{ex.content}"
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div className="tpg">{ex.page_number ? `Página ${ex.page_number}` : ''}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span
                              onClick={() => setExpandedExcerptId(isExpanded ? null : ex.id)}
                              style={{ cursor: 'pointer', fontSize: 13, lineHeight: 1, color: isExpanded ? 'var(--accent)' : undefined }}
                              title={isExpanded ? 'Recolher trecho' : 'Ver trecho completo'}
                            >
                              {isExpanded ? '👁‍🗨' : '👁'}
                            </span>
                            <span
                              onClick={() => toggleExcerptPrivacy(ex)}
                              style={{ cursor: 'pointer', fontSize: 13, lineHeight: 1 }}
                              title={ex.is_public ? 'Público — toque para tornar privado' : 'Privado — toque para tornar público'}
                            >
                              {ex.is_public ? '🌐' : '🔒'}
                            </span>
                            <span onClick={() => openEditExcerptForm(ex)} style={{ cursor: 'pointer', display: 'flex' }} title="Editar trecho">
                              <PencilIcon />
                            </span>
                            <span onClick={() => deleteExcerpt(ex.id)} style={{ cursor: 'pointer', display: 'flex' }}>
                              <TrashIconSmall />
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 6 }}>{formatExcerptDate(ex.created_at)}</div>
                      </div>
                    )
                  })}

                  {communityExcerpts.length > 0 && (
                    <>
                      <div className="bl" style={{ marginTop: 18 }}>Trechos da comunidade</div>
                      {communityExcerpts.map(ex => {
                        const isExpanded = expandedExcerptId === ex.id
                        return (
                          <div className="tcrd" key={ex.id}>
                            <div
                              className="ttxt"
                              style={isExpanded ? {} : {
                                display: '-webkit-box',
                                WebkitLineClamp: 8,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              "{ex.content}"
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div className="tpg">{ex.page_number ? `Página ${ex.page_number}` : ''}</div>
                              <span
                                onClick={() => setExpandedExcerptId(isExpanded ? null : ex.id)}
                                style={{ cursor: 'pointer', fontSize: 13, lineHeight: 1, color: isExpanded ? 'var(--accent)' : undefined }}
                                title={isExpanded ? 'Recolher trecho' : 'Ver trecho completo'}
                              >
                                {isExpanded ? '👁‍🗨' : '👁'}
                              </span>
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 6 }}>{formatExcerptDate(ex.created_at)}</div>
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              )}

              {/* Comunidade */}
              {activeTab === 'C' && (
                <CommentThread target={{ itemId: localItem.id }} currentUserId={session.user.id} />
              )}
            </>
          )}

        </div>

        {/* Bottom navigation */}
        <div className="bnav">
          <div className="ni" onClick={() => onNavigate('library')}>
            <span className="nic">📚</span>
            <span className="nla">Biblioteca</span>
          </div>
          <div className="ni" onClick={() => onNavigate('community')}>
            <span className="nic">👥</span>
            <span className="nla">Comunidade</span>
          </div>
          <div className="ni" onClick={() => onNavigate('search')}>
            <span className="nic">🔍</span>
            <span className="nla">Buscar</span>
          </div>
          <div className="ni" onClick={() => onNavigate('profile')}>
            <span className="nic">👤</span>
            <span className="nla">Perfil</span>
          </div>
        </div>

      </div>

      {/* Modal de confirmação de remoção */}
      {showRemoveModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            padding: '0 20px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowRemoveModal(false) }}
        >
          <div style={{
            width: '100%', maxWidth: 360,
            background: 'var(--bg)', backgroundImage: 'var(--bg)',
            border: '1px solid var(--bor)',
            borderRadius: 22, padding: '24px 20px',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(229,115,115,0.15)', border: '1px solid rgba(229,115,115,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <TrashIcon />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', textAlign: 'center', marginBottom: 8 }}>
              Remover da sua biblioteca?
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.55, marginBottom: 22 }}>
              Sua avaliação e resenha também serão removidas.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowRemoveModal(false)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 14,
                  border: '1px solid var(--bor2)', background: 'var(--sur)',
                  color: 'var(--text)', fontFamily: "'Figtree', sans-serif",
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={removeFromLibrary}
                disabled={removing}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 14,
                  border: 'none', background: '#E57373',
                  color: '#fff', fontFamily: "'Figtree', sans-serif",
                  fontSize: 13, fontWeight: 700, cursor: removing ? 'default' : 'pointer',
                  opacity: removing ? 0.7 : 1,
                }}
              >
                {removing ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão definitiva do livro */}
      {showDeleteBookModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            padding: '0 20px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteBookModal(false) }}
        >
          <div style={{
            width: '100%', maxWidth: 360,
            background: 'var(--bg)', backgroundImage: 'var(--bg)',
            border: '1px solid var(--bor)',
            borderRadius: 22, padding: '24px 20px',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(229,115,115,0.15)', border: '1px solid rgba(229,115,115,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <TrashIcon />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', textAlign: 'center', marginBottom: 8 }}>
              Excluir este livro?
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.55, marginBottom: 22 }}>
              Tem certeza? Esse livro e todas as anotações serão excluídos permanentemente.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteBookModal(false)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 14,
                  border: '1px solid var(--bor2)', background: 'var(--sur)',
                  color: 'var(--text)', fontFamily: "'Figtree', sans-serif",
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={deleteBookPermanently}
                disabled={deletingBook}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 14,
                  border: 'none', background: '#E57373',
                  color: '#fff', fontFamily: "'Figtree', sans-serif",
                  fontSize: 13, fontWeight: 700, cursor: deletingBook ? 'default' : 'pointer',
                  opacity: deletingBook ? 0.7 : 1,
                }}
              >
                {deletingBook ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
