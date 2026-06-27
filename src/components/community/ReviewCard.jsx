import { useRef, useState } from 'react'
import ExpandableText from '../ExpandableText'
import CommentThread from '../comments/CommentThread'
import { formatCommentDate } from '../../utils/formatDate'

const AVATAR_COLORS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']
const COVER_COLORS  = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']
const FILM_COLORS   = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6']

function hashToIndex(str, mod) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % mod
  return Math.abs(hash) % mod
}

function Avatar({ profile, userId }) {
  const [err, setErr] = useState(false)
  const name = profile?.username || profile?.full_name || '?'
  const initial = name.charAt(0).toUpperCase()

  if (profile?.avatar_url && !err) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        onError={() => setErr(true)}
        className="post-feed-av"
        style={{ objectFit: 'cover' }}
      />
    )
  }

  const cls = AVATAR_COLORS[hashToIndex(userId || '', AVATAR_COLORS.length)]
  return <div className={`post-feed-av ${cls}`}><span>{initial}</span></div>
}

function ItemCover({ item }) {
  const [err, setErr] = useState(false)

  if (item?.cover_url && !err) {
    return (
      <img
        src={item.cover_url}
        alt=""
        onError={() => setErr(true)}
        style={{ width: 44, height: 60, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }

  const colors = item?.type === 'movie' ? FILM_COLORS : COVER_COLORS
  const cls = colors[hashToIndex(item?.title || '?', colors.length)]
  return <div className={cls} style={{ width: 44, height: 60, borderRadius: 6, flexShrink: 0 }} />
}

function Stars({ rating }) {
  if (!rating) return null
  return (
    <div style={{ fontSize: 12, color: '#C4A8F0', letterSpacing: 1, marginTop: 3 }}>
      {Array.from({ length: 5 }, (_, i) => (i < rating ? '★' : '☆')).join('')}
    </div>
  )
}

export default function ReviewCard({ review, currentUserId, onNavigate, onToggleLike }) {
  const [commentsOpen, setCommentsOpen] = useState(false)
  const threadRef = useRef(null)
  const displayName = review.profiles?.username || review.profiles?.full_name || 'Usuário'
  const handle = review.profiles?.username ? `@${review.profiles.username}` : ''
  const item = review.items
  const isOwner = review.user_id === currentUserId

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
            onClick={!isOwner ? () => onNavigate('publicProfile', { userId: review.user_id }) : undefined}
          >
            <Avatar profile={review.profiles} userId={review.user_id} />
            <div style={{ minWidth: 0 }}>
              <div className="post-feed-name">{displayName}</div>
              {handle && <div className="post-feed-handle">{handle}</div>}
            </div>
          </div>
          <div className="post-feed-time">{formatCommentDate(review.created_at)}</div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 10 }}>
          <ItemCover item={item} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
              {item?.type === 'movie' ? '🎬 Resenha de filme' : '📚 Resenha de livro'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
              {item?.title || 'Item desconhecido'}
            </div>
            <Stars rating={review.rating} />
          </div>
        </div>
      </div>

      <div className="post-feed-body">
        <ExpandableText text={review.body || ''} />

        <div className="post-actions">
          <button
            className={`cma-btn${review.likedByMe ? ' liked' : ''}`}
            onClick={() => onToggleLike(review.id)}
          >
            <span className="heart">{review.likedByMe ? '❤️' : '🤍'}</span>
            <span>{review.likeCount}</span>
          </button>
          <div className="cma-sep" />
          <button className="cma-btn" onClick={handleCommentClick}>
            💬 <span>{review.commentCount} comentário{review.commentCount === 1 ? '' : 's'}</span>
          </button>
        </div>

        {commentsOpen && (
          <CommentThread ref={threadRef} target={{ reviewId: review.id }} currentUserId={currentUserId} />
        )}
      </div>
    </div>
  )
}
