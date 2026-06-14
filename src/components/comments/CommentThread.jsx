import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { useComments } from '../../hooks/useComments'
import { formatCommentDate } from '../../utils/formatDate'

const AVATAR_COLORS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']

function hashToIndex(str, mod) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % mod
  return Math.abs(hash) % mod
}

export function Avatar({ profile, userId, size = 28 }) {
  const [err, setErr] = useState(false)
  const name = profile?.username || profile?.full_name || '?'
  const initial = name.charAt(0).toUpperCase()

  if (profile?.avatar_url && !err) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }

  const cls = AVATAR_COLORS[hashToIndex(userId || '', AVATAR_COLORS.length)]
  return (
    <div className={cls} style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#fff', fontWeight: 700, fontSize: Math.round(size * 0.4) }}>{initial}</span>
    </div>
  )
}

function displayName(c) {
  return c.profiles?.username || c.profiles?.full_name || 'Usuário'
}

const CommentThread = forwardRef(function CommentThread({ target, currentUserId }, ref) {
  const { comments, loading, addComment, deleteComment, toggleLike } = useComments(target, currentUserId)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const inputRef = useRef(null)

  useImperativeHandle(ref, () => ({
    focusInput: () => inputRef.current?.focus(),
  }))

  async function handleSend() {
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    const { error } = await addComment(content)
    setSending(false)
    if (!error) setText('')
  }

  async function handleSendReply(parentId) {
    const content = replyText.trim()
    if (!content || sendingReply) return
    setSendingReply(true)
    const { error } = await addComment(content, parentId)
    setSendingReply(false)
    if (!error) {
      setReplyText('')
      setReplyingTo(null)
    }
  }

  function renderActions(c) {
    return (
      <div className={c.parent_id ? 'reply-meta' : 'cmt-meta'}>
        <span className="cmt-time">{formatCommentDate(c.created_at)}</span>
        <button className={`cmt-like${c.likedByMe ? ' liked' : ''}`} onClick={() => toggleLike(c.id)}>
          <span>{c.likedByMe ? '❤️' : '🤍'}</span> {c.likeCount}
        </button>
        {!c.parent_id && (
          <button className="cmt-reply-btn" onClick={() => setReplyingTo(r => r === c.id ? null : c.id)}>
            ↩ Responder
          </button>
        )}
        {c.user_id === currentUserId && (
          confirmDeleteId === c.id ? (
            <>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>Excluir?</span>
              <button className="cmt-reply-btn cmt-del-btn" style={{ color: 'var(--red)' }} onClick={() => deleteComment(c.id)}>Sim</button>
              <button className="cmt-reply-btn" onClick={() => setConfirmDeleteId(null)}>Não</button>
            </>
          ) : (
            <button className="cmt-reply-btn cmt-del-btn" onClick={() => setConfirmDeleteId(c.id)}>🗑</button>
          )
        )}
      </div>
    )
  }

  return (
    <div className="comments-section">
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 12 }}>Carregando comentários…</div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>Nenhum comentário ainda.</div>
          <div style={{ fontSize: 11, lineHeight: 1.55 }}>Seja o primeiro a comentar.</div>
        </div>
      ) : (
        comments.map(c => (
          <div className="cmt-item" key={c.id}>
            <Avatar profile={c.profiles} userId={c.user_id} />
            <div className="cmt-body">
              <div className="cmt-name">{displayName(c)}</div>
              <div className="cmt-text">{c.content}</div>
              {renderActions(c)}

              {c.replies.length > 0 && (
                <div className="replies">
                  {c.replies.map(r => (
                    <div className="reply-item" key={r.id}>
                      <Avatar profile={r.profiles} userId={r.user_id} size={22} />
                      <div className="reply-body">
                        <div className="reply-name">{displayName(r)}</div>
                        <div className="reply-text">{r.content}</div>
                        {renderActions(r)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {replyingTo === c.id && (
                <div className="cmt-input-row" style={{ marginTop: 8 }}>
                  <textarea
                    className="cmt-inp"
                    rows={1}
                    placeholder="Responder..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    style={{ fontSize: 11 }}
                    autoFocus
                  />
                  <button
                    className="cmt-send"
                    style={{ width: 28, height: 28, fontSize: 12 }}
                    onClick={() => handleSendReply(c.id)}
                    disabled={!replyText.trim() || sendingReply}
                  >
                    ➤
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      <div className="cmt-input-row">
        <textarea
          ref={inputRef}
          className="cmt-inp"
          rows={1}
          placeholder="Escreva um comentário..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button className="cmt-send" onClick={handleSend} disabled={!text.trim() || sending}>➤</button>
      </div>
    </div>
  )
})

export default CommentThread
