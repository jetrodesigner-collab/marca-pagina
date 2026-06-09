import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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

export default function ItemDetail({ session, item: itemProp, userItem: userItemProp, onBack, onUserItemUpdate }) {
  const [theme]        = useState(() => localStorage.getItem('tema') || 'D')
  const [activeTab,    setActiveTab]    = useState('R')
  const [localItem,    setLocalItem]    = useState(itemProp)
  const [localUserItem, setLocalUserItem] = useState(userItemProp)
  const [status,       setStatus]       = useState(userItemProp?.status ?? null)
  const [rating,       setRating]       = useState(userItemProp?.rating || 0)
  const [review,       setReview]       = useState('')
  const [isPublic,     setIsPublic]     = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [saveFeedback, setSaveFeedback] = useState(null)
  const [adding,       setAdding]       = useState(false)
  const [addError,     setAddError]     = useState(false)

  const isBook       = localItem.type === 'book'
  const themeClass   = theme === 'L' ? 'light' : 'dark'
  const statuses     = isBook ? BOOK_STATUSES : MOVIE_STATUSES
  const isInLibrary  = !!localUserItem
  const statusInfo   = status ? STATUS_META[status] : null

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
        if (data) {
          setReview(data.body || '')
          setIsPublic(data.is_public || false)
        }
      })
  }, [localItem.id, localUserItem?.id, session.user.id])

  async function addToLibrary(chosenStatus) {
    if (adding) return
    setAdding(true)
    setAddError(false)
    try {
      // Ensure item row exists in items table
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

      // Insert user_items row
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
    setSaveFeedback(null)
    const { error } = await supabase
      .from('reviews')
      .upsert(
        { user_id: session.user.id, item_id: localItem.id, body: review, is_public: isPublic, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,item_id' }
      )
    setSaving(false)
    setSaveFeedback(error ? 'err' : 'ok')
    setTimeout(() => setSaveFeedback(null), 2500)
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
          <div className="ph-t">{isBook ? 'Detalhes do Livro' : 'Detalhes do Filme'}</div>
        </div>

        <div className="gl" />

        {/* Scroll area */}
        <div className="sc">

          {/* Hero */}
          <div className="hero">
            <HeroCover item={localItem} />
            <div className="hm">
              <div className="ht">{localItem.title}</div>
              {localItem.author   && <div className="hs">{localItem.author}</div>}
              {localItem.director && <div className="hs">Dir. {localItem.director}</div>}
              {localItem.year     && <div className="hy">{localItem.year}</div>}
              {isInLibrary && statusInfo && (
                <div className="tags" style={{ marginTop: 8 }}>
                  <span className={`sb ${statusInfo.badge}`}>
                    <div className={`dot ${statusInfo.dot}`} />
                    {statusInfo.label}
                  </span>
                </div>
              )}
            </div>
          </div>

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
                      className="rtxt"
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', minHeight: 120, fontFamily: "'Figtree', sans-serif", lineHeight: 1.65 }}
                      placeholder={`Escreva o que esse ${isBook ? 'livro' : 'filme'} representou para você...`}
                      value={review}
                      onChange={e => setReview(e.target.value)}
                    />
                  </div>
                  <div className="bl">Privacidade</div>
                  <div className="priv">
                    <button className={`pb${!isPublic ? ' on' : ''}`} onClick={() => setIsPublic(false)}>🔒 Privado</button>
                    <button className={`pb${isPublic  ? ' on' : ''}`} onClick={() => setIsPublic(true)}>🌐 Público</button>
                  </div>
                  <button className="savebtn" onClick={saveReview} disabled={saving}>
                    {saving
                      ? 'Salvando...'
                      : saveFeedback === 'ok'
                        ? '✓ Resenha salva!'
                        : saveFeedback === 'err'
                          ? 'Erro ao salvar'
                          : 'Salvar Resenha'}
                  </button>
                </div>
              )}

              {/* Trechos (livros) */}
              {activeTab === 'T' && (
                <div>
                  <button className="addt">＋ Adicionar trecho</button>
                  <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--muted)' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>Nenhum trecho ainda</div>
                    <div style={{ fontSize: 11, lineHeight: 1.55 }}>Salve suas passagens favoritas</div>
                  </div>
                </div>
              )}

              {/* Comunidade */}
              {activeTab === 'C' && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>Em breve</div>
                  <div style={{ fontSize: 11, lineHeight: 1.55 }}>Resenhas e comentários da comunidade</div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
