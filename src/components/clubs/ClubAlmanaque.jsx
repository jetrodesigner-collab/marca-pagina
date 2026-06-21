import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useClubAlmanaque } from '../../hooks/useClubAlmanaque'

// ── Shared utilities ──────────────────────────────────────────────────────────

const MEMBER_COLORS = [
  { bg: 'rgba(196,168,240,.14)', color: '#C4A8F0' },
  { bg: 'rgba(126,223,168,.13)', color: '#7EDFA8' },
  { bg: 'rgba(240,201,122,.13)', color: '#F0C97A' },
  { bg: 'rgba(240,122,122,.13)', color: '#F07A7A' },
  { bg: 'rgba(122,170,206,.13)', color: '#7AAACE' },
  { bg: 'rgba(208,130,208,.13)', color: '#D082D0' },
]
function colorFor(id) {
  let h = 0
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) % MEMBER_COLORS.length
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length]
}
function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  if (diff < 172800) return 'ontem'
  return new Date(ts).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}
function Avatar({ userId, profile, size = 24 }) {
  const color = colorFor(userId)
  const initial = (profile?.full_name || profile?.username || '?').charAt(0).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color.bg, color: color.color, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700,
    }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initial}
    </div>
  )
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(196,168,240,.15)',
  borderRadius: 8, padding: '7px 10px', fontFamily: 'Figtree, sans-serif',
  fontSize: 12, color: 'var(--text)', outline: 'none',
}

// ── Comment item ──────────────────────────────────────────────────────────────

function CommentItem({ comment, currentUserId, isAdmin, onDelete }) {
  const name = comment.profile?.full_name || comment.profile?.username || 'Usuário'
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
      <Avatar userId={comment.user_id} profile={comment.profile} size={20} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{name}</span>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{timeAgo(comment.created_at)}</span>
          {(comment.user_id === currentUserId || isAdmin) && (
            <button
              onClick={onDelete}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--muted)', padding: 0, fontFamily: 'Figtree, sans-serif' }}
            >
              ✕
            </button>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(240,235,248,.7)', lineHeight: 1.5 }}>{comment.content}</div>
      </div>
    </div>
  )
}

// ── Comments inline section (reused for both card and note) ──────────────────

function CommentsSection({ comments, currentUserId, isAdmin, onAdd, onDelete }) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleAdd() {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    try {
      await onAdd(text.trim())
      setText('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(196,168,240,.08)' }}>
      {comments.map(c => (
        <CommentItem
          key={c.id}
          comment={c}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onDelete={() => onDelete(c.id)}
        />
      ))}
      <div style={{ display: 'flex', gap: 7, marginTop: 6 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Escreva um comentário..."
          style={{ ...inputStyle, flex: 1, padding: '6px 9px', fontSize: 11 }}
        />
        <button
          onClick={handleAdd}
          disabled={submitting || !text.trim()}
          style={{
            background: 'var(--accent)', color: '#1A1720', border: 'none',
            borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'Figtree, sans-serif',
            opacity: (!text.trim() || submitting) ? 0.5 : 1,
          }}
        >
          OK
        </button>
      </div>
    </div>
  )
}

// ── Admin content card (Contexto Histórico / Curiosidades) ───────────────────

function AdminContentCard({
  cardType, title, emoji, value,
  isAdmin, likes, comments, currentUserId,
  onSave, onClear, onToggleLike, onAddComment, onDeleteComment,
  onToast,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [showComments, setShowComments] = useState(false)

  const myLike = likes.find(l => l.user_id === currentUserId)
  const hasContent = Boolean(value?.trim())

  if (!hasContent && !isAdmin) return null

  if (!hasContent && isAdmin) {
    return (
      <div
        className="cl-alma-card"
        style={{ borderStyle: 'dashed', borderColor: 'rgba(196,168,240,.2)', background: 'rgba(196,168,240,.03)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{emoji} {title}</div>
          <button
            onClick={() => { setDraft(''); setEditing(true) }}
            style={{
              fontSize: 11, fontWeight: 600, color: 'var(--accent)',
              background: 'rgba(196,168,240,.1)', border: '1px solid rgba(196,168,240,.2)',
              borderRadius: 7, padding: '3px 10px', cursor: 'pointer', fontFamily: 'Figtree, sans-serif',
            }}
          >
            + Adicionar
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>Nenhum conteúdo ainda.</div>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="cl-alma-card">
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>{emoji} {title}</div>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={`Escreva sobre ${title.toLowerCase()}...`}
          rows={5}
          autoFocus
          style={{ ...inputStyle, resize: 'none', fontSize: 12, lineHeight: 1.55 }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            onClick={() => setEditing(false)}
            style={{
              flex: 1, padding: '8px', borderRadius: 9,
              border: '1px solid rgba(196,168,240,.2)', background: 'none',
              color: 'var(--muted)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Figtree, sans-serif',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              if (!draft.trim()) return
              setSaving(true)
              try {
                await onSave(draft.trim())
                setEditing(false)
                onToast?.('✓ Salvo!')
              } catch {
                onToast?.('Erro ao salvar.')
              } finally {
                setSaving(false)
              }
            }}
            disabled={saving || !draft.trim()}
            style={{
              flex: 1, padding: '8px', borderRadius: 9, border: 'none',
              background: saving ? 'rgba(196,168,240,.4)' : 'var(--accent)',
              color: '#1A1720', fontSize: 12, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Figtree, sans-serif',
            }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="cl-alma-card">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{emoji} {title}</div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
            <button
              onClick={() => { setDraft(value || ''); setEditing(true) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '0 2px', color: 'var(--muted)' }}
            >
              ✏️
            </button>
            <button
              onClick={async () => {
                try {
                  await onClear()
                  onToast?.('Conteúdo removido.')
                } catch {
                  onToast?.('Erro ao remover.')
                }
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '0 2px', color: 'var(--muted)' }}
            >
              🗑
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ fontSize: 12, color: 'rgba(240,235,248,.72)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
        {value}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 14, marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(196,168,240,.1)' }}>
        <button
          onClick={onToggleLike}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Figtree, sans-serif', fontSize: 11, fontWeight: 500, padding: 0,
            color: myLike ? 'var(--accent)' : 'var(--muted)',
          }}
        >
          ❤️ {likes.length || 0}
        </button>
        <button
          onClick={() => setShowComments(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Figtree, sans-serif', fontSize: 11, fontWeight: 500, padding: 0,
            color: showComments ? 'var(--accent)' : 'var(--muted)',
          }}
        >
          💬 {comments.length ? comments.length : 'Comentar'}
        </button>
      </div>

      {showComments && (
        <CommentsSection
          comments={comments}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onAdd={onAddComment}
          onDelete={onDeleteComment}
        />
      )}
    </div>
  )
}

// ── Note item ─────────────────────────────────────────────────────────────────

function NoteItem({ note, currentUserId, isAdmin, onDelete, onToggleLike, onAddComment, onDeleteComment }) {
  const [showComments, setShowComments] = useState(false)
  const liked = note.likes.some(l => l.user_id === currentUserId)
  const name = note.profile?.full_name || note.profile?.username || 'Usuário'

  return (
    <div style={{
      marginBottom: 12, background: 'rgba(42,38,55,1)',
      border: '1px solid var(--bor)', borderRadius: 14, padding: '14px 16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <Avatar userId={note.user_id} profile={note.profile} size={26} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{name}</span>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{timeAgo(note.created_at)}</span>
        {(note.user_id === currentUserId || isAdmin) && (
          <button
            onClick={onDelete}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--muted)', padding: '0 0 0 6px', fontFamily: 'Figtree, sans-serif' }}
          >
            🗑
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ fontSize: 12, color: 'rgba(240,235,248,.82)', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
        {note.content}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 14, borderTop: '1px solid rgba(196,168,240,.08)', paddingTop: 10 }}>
        <button
          onClick={onToggleLike}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Figtree, sans-serif', fontSize: 11, fontWeight: 500, padding: 0,
            color: liked ? 'var(--accent)' : 'var(--muted)',
          }}
        >
          ❤️ {note.likes.length}
        </button>
        <button
          onClick={() => setShowComments(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Figtree, sans-serif', fontSize: 11, fontWeight: 500, padding: 0,
            color: showComments ? 'var(--accent)' : 'var(--muted)',
          }}
        >
          💬 {note.comments.length ? note.comments.length : 'Comentar'}
        </button>
      </div>

      {showComments && (
        <CommentsSection
          comments={note.comments}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onAdd={onAddComment}
          onDelete={commentId => onDeleteComment(commentId)}
        />
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ClubAlmanaque({ club, clubId, currentUserId, isAdmin, onToast }) {
  const [bookData, setBookData] = useState(null)
  const [oldMetas, setOldMetas] = useState([])
  const [bookLoading, setBookLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [toast, setToast] = useState(null)

  const {
    content, notes, cardLikes, cardComments, loading,
    saveContent, addNote, deleteNote,
    toggleNoteLike, addNoteComment, deleteNoteComment,
    toggleCardLike, addCardComment, deleteCardComment,
  } = useClubAlmanaque(clubId, currentUserId)

  useEffect(() => { loadBook() }, [clubId])

  async function loadBook() {
    setBookLoading(true)
    const metasReq = supabase
      .from('club_metas')
      .select('titulo, criado_em')
      .eq('club_id', clubId)
      .eq('ativa', false)
      .order('criado_em', { ascending: false })

    let bookReq = null
    if (club.livro_id) {
      bookReq = fetch(`https://openlibrary.org${club.livro_id}.json`).then(r => r.json()).catch(() => null)
    }

    const [{ data: metas }, bookJson] = await Promise.all([metasReq, bookReq || Promise.resolve(null)])
    setOldMetas(metas || [])

    if (bookJson) {
      setBookData({
        sinopse: typeof bookJson.description === 'string'
          ? bookJson.description
          : bookJson.description?.value || '',
        paginas: bookJson.number_of_pages || bookJson.pagination || null,
      })
    }
    setBookLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function handleSaveField(field, value) {
    await saveContent(
      field === 'contexto_historico' ? value : (content?.contexto_historico || null),
      field === 'curiosidades'       ? value : (content?.curiosidades || null),
    )
  }

  async function handleAddNote() {
    if (!noteText.trim() || addingNote) return
    setAddingNote(true)
    try {
      await addNote(noteText.trim())
      setNoteText('')
    } catch {
      showToast('Erro ao adicionar nota.')
    } finally {
      setAddingNote(false)
    }
  }

  return (
    <div style={{ padding: '20px 20px 120px' }}>

      {/* ── Admin content cards ── */}
      <AdminContentCard
        cardType="contexto_historico"
        title="Contexto Histórico"
        emoji="🏛️"
        value={content?.contexto_historico || null}
        isAdmin={isAdmin}
        likes={cardLikes.filter(l => l.card_type === 'contexto_historico')}
        comments={cardComments.filter(c => c.card_type === 'contexto_historico')}
        currentUserId={currentUserId}
        onSave={v => handleSaveField('contexto_historico', v)}
        onClear={() => handleSaveField('contexto_historico', null)}
        onToggleLike={() => toggleCardLike('contexto_historico')}
        onAddComment={t => addCardComment('contexto_historico', t)}
        onDeleteComment={deleteCardComment}
        onToast={showToast}
      />
      <AdminContentCard
        cardType="curiosidades"
        title="Curiosidades"
        emoji="💡"
        value={content?.curiosidades || null}
        isAdmin={isAdmin}
        likes={cardLikes.filter(l => l.card_type === 'curiosidades')}
        comments={cardComments.filter(c => c.card_type === 'curiosidades')}
        currentUserId={currentUserId}
        onSave={v => handleSaveField('curiosidades', v)}
        onClear={() => handleSaveField('curiosidades', null)}
        onToggleLike={() => toggleCardLike('curiosidades')}
        onAddComment={t => addCardComment('curiosidades', t)}
        onDeleteComment={deleteCardComment}
        onToast={showToast}
      />

      {/* ── Book info (existing) ── */}
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
        Contexto histórico, curiosidades e notas sobre{' '}
        <em style={{ color: 'rgba(240,235,248,.62)' }}>{club.livro_titulo || 'este livro'}</em>.
      </div>

      {club.livro_titulo && (
        <div className="cl-alma-card">
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 9, color: 'var(--text)' }}>📚 Sobre o livro</div>
          <div style={{ fontSize: 12, color: 'rgba(240,235,248,.62)', lineHeight: 1.58 }}>
            {bookLoading ? 'Carregando informações...' : (
              bookData?.sinopse
                ? bookData.sinopse.slice(0, 400) + (bookData.sinopse.length > 400 ? '...' : '')
                : `"${club.livro_titulo}"${club.livro_autor ? ` de ${club.livro_autor}` : ''}.`
            )}
          </div>
          {bookData?.paginas && (
            <span style={{ display: 'inline-block', marginTop: 7, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: 'rgba(196,168,240,.14)', color: 'var(--accent)' }}>
              {bookData.paginas} páginas
            </span>
          )}
        </div>
      )}

      {club.livro_autor && (
        <div className="cl-alma-card">
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 9, color: 'var(--text)' }}>✍️ Autor</div>
          <div style={{ fontSize: 12, color: 'rgba(240,235,248,.62)', lineHeight: 1.58 }}>{club.livro_autor}</div>
          <span style={{ display: 'inline-block', marginTop: 7, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,223,168,.1)', color: '#7EDFA8' }}>
            Autor
          </span>
        </div>
      )}

      {oldMetas.length > 0 && (
        <div className="cl-alma-card">
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 9, color: 'var(--text)' }}>📌 Metas anteriores</div>
          <div style={{ fontSize: 12, color: 'rgba(240,235,248,.62)', lineHeight: 1.68 }}>
            {oldMetas.map((m, i) => <div key={i} style={{ marginBottom: 4 }}>{m.titulo}</div>)}
          </div>
          <span style={{ display: 'inline-block', marginTop: 7, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,223,168,.1)', color: '#7EDFA8' }}>
            Histórico
          </span>
        </div>
      )}

      {!club.livro_titulo && !bookLoading && (
        <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--muted)' }}>
          Nenhum livro selecionado para o clube.
        </div>
      )}

      {/* ── Notes section ── */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>
          📝 Notas dos membros
        </div>

        {/* Composer */}
        <div style={{
          background: 'var(--sur)', border: '1px solid var(--bor)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 16,
        }}>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Escreva uma nota sobre o livro..."
            rows={3}
            style={{ ...inputStyle, resize: 'none', fontSize: 12, lineHeight: 1.55, display: 'block' }}
          />
          <button
            onClick={handleAddNote}
            disabled={addingNote || !noteText.trim()}
            style={{
              marginTop: 10, width: '100%', padding: '9px', borderRadius: 10,
              background: (addingNote || !noteText.trim()) ? 'rgba(196,168,240,.3)' : 'var(--accent)',
              color: '#1A1720', border: 'none', fontSize: 12, fontWeight: 700,
              cursor: (addingNote || !noteText.trim()) ? 'not-allowed' : 'pointer',
              fontFamily: 'Figtree, sans-serif',
            }}
          >
            {addingNote ? 'Adicionando...' : '+ Adicionar nota'}
          </button>
        </div>

        {/* Notes list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--muted)' }}>
            Carregando...
          </div>
        ) : notes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--muted)' }}>
            Nenhuma nota ainda. Seja o primeiro!
          </div>
        ) : (
          notes.map(note => (
            <NoteItem
              key={note.id}
              note={note}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onDelete={() => deleteNote(note.id)}
              onToggleLike={() => toggleNoteLike(note.id)}
              onAddComment={t => addNoteComment(note.id, t)}
              onDeleteComment={commentId => deleteNoteComment(note.id, commentId)}
            />
          ))
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
