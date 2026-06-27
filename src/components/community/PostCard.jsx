import { useRef, useState } from 'react'
import ExpandableText from '../ExpandableText'
import CommentThread from '../comments/CommentThread'
import { formatCommentDate } from '../../utils/formatDate'

const AVATAR_COLORS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']

function hashToIndex(str, mod) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % mod
  return Math.abs(hash) % mod
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E57373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function Avatar({ profile, userId }) {
  const [err, setErr] = useState(false)
  const name = profile?.username || profile?.full_name || '?'
  const initial = name.charAt(0).toUpperCase()

  if (profile?.avatar_url && !err) {
    return <img src={profile.avatar_url} alt="" onError={() => setErr(true)} className="post-feed-av" style={{ objectFit: 'cover' }} />
  }

  const cls = AVATAR_COLORS[hashToIndex(userId || '', AVATAR_COLORS.length)]
  return (
    <div className={`post-feed-av ${cls}`}>
      <span>{initial}</span>
    </div>
  )
}

export default function PostCard({ post, currentUserId, onNavigate, onToggleLike, onDelete }) {
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const threadRef = useRef(null)
  const isOwner = post.user_id === currentUserId
  const displayName = post.profiles?.username || post.profiles?.full_name || 'Usuário'
  const handle = post.profiles?.username ? `@${post.profiles.username}` : ''

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    await onDelete(post.id)
    setDeleting(false)
    setShowDeleteModal(false)
  }

  function handleCommentClick() {
    setCommentsOpen(o => {
      const next = !o
      if (next) setTimeout(() => threadRef.current?.focusInput(), 50)
      return next
    })
  }

  return (
    <div className="post-feed-card">
      <div className="post-feed-top">
        <div className="post-feed-head">
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: isOwner ? 'default' : 'pointer' }}
            onClick={!isOwner ? () => onNavigate('publicProfile', { userId: post.user_id }) : undefined}
          >
            <Avatar profile={post.profiles} userId={post.user_id} />
            <div style={{ minWidth: 0 }}>
              <div className="post-feed-name">
                {displayName}
                {isOwner && <span className="post-own-badge">Seu post</span>}
              </div>
              {handle && <div className="post-feed-handle">{handle}</div>}
            </div>
          </div>
          <div className="post-feed-time">{formatCommentDate(post.created_at)}</div>
        </div>
        {post.title && <div className="post-feed-title">{post.title}</div>}
      </div>

      <div className="post-feed-body">
        <ExpandableText text={post.content} />

        <div className="post-actions">
          <button className={`cma-btn${post.likedByMe ? ' liked' : ''}`} onClick={() => onToggleLike(post.id)}>
            <span className="heart">{post.likedByMe ? '❤️' : '🤍'}</span> <span>{post.likeCount}</span>
          </button>
          <div className="cma-sep" />
          <button className="cma-btn" onClick={handleCommentClick}>
            💬 <span>{post.commentCount} comentário{post.commentCount === 1 ? '' : 's'}</span>
          </button>
          {isOwner && (
            <div className="owner-actions">
              <button className="edit-btn" onClick={() => onNavigate('postForm', { post })}>✏️ Editar</button>
              <button className="del-btn" onClick={() => setShowDeleteModal(true)}>🗑 Excluir</button>
            </div>
          )}
        </div>

        {commentsOpen && (
          <CommentThread ref={threadRef} target={{ postId: post.id }} currentUserId={currentUserId} />
        )}
      </div>

      {showDeleteModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            padding: '0 20px',
          }}
          onClick={e => { if (e.target === e.currentTarget && !deleting) setShowDeleteModal(false) }}
        >
          <div style={{
            width: '100%', maxWidth: 360,
            background: 'var(--bg)',
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
              Excluir este post?
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.55, marginBottom: 22 }}>
              Os comentários e curtidas também serão removidos. Isso não pode ser desfeito.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
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
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 14,
                  border: 'none', background: '#E57373',
                  color: '#fff', fontFamily: "'Figtree', sans-serif",
                  fontSize: 13, fontWeight: 700, cursor: deleting ? 'default' : 'pointer',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
