import CommentCard from './CommentCard'

function SkeletonCard() {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--bor2)' }}>
      <div className="comment-skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="comment-skeleton" style={{ width: '40%', height: 12, marginBottom: 8 }} />
        <div className="comment-skeleton" style={{ width: '90%', height: 12, marginBottom: 6 }} />
        <div className="comment-skeleton" style={{ width: '60%', height: 12 }} />
      </div>
    </div>
  )
}

export default function CommentList({ comments, loading, currentUserId, onDelete }) {
  if (loading) {
    return (
      <div>
        {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>Nenhum comentário ainda.</div>
        <div style={{ fontSize: 11, lineHeight: 1.55 }}>Seja o primeiro a comentar sobre este item.</div>
      </div>
    )
  }

  return (
    <div>
      {comments.map(c => (
        <CommentCard key={c.id} comment={c} isOwner={c.user_id === currentUserId} onDelete={onDelete} />
      ))}
    </div>
  )
}
