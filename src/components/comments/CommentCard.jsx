import { useState } from 'react'

const AVATAR_COLORS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']

function hashToIndex(str, mod) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % mod
  return Math.abs(hash) % mod
}

function TrashIcon20() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--muted)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    return (
      <img
        src={profile.avatar_url}
        alt=""
        onError={() => setErr(true)}
        style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }

  const cls = AVATAR_COLORS[hashToIndex(userId, AVATAR_COLORS.length)]
  return (
    <div className={cls} style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{initial}</span>
    </div>
  )
}

export function formatCommentDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'agora'
  if (diffHour < 1) return `há ${diffMin} minuto${diffMin === 1 ? '' : 's'}`
  if (diffDay < 1) return `há ${diffHour} hora${diffHour === 1 ? '' : 's'}`
  if (diffDay < 30) return `há ${diffDay} dia${diffDay === 1 ? '' : 's'}`

  const diffMonth = Math.floor(diffDay / 30)
  if (diffMonth < 12) return `há ${diffMonth} mês${diffMonth === 1 ? '' : 'es'}`

  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CommentCard({ comment, isOwner, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const displayName = comment.profiles?.username || comment.profiles?.full_name || 'Usuário'

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    await onDelete(comment.id)
    setDeleting(false)
  }

  return (
    <div style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--bor2)' }}>
      <Avatar profile={comment.profiles} userId={comment.user_id} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#F0ECF8' }}>{displayName}</span>
          {isOwner && !confirming && (
            <span
              onClick={() => setConfirming(true)}
              style={{ cursor: 'pointer', display: 'flex', flexShrink: 0 }}
              title="Excluir comentário"
            >
              <TrashIcon20 />
            </span>
          )}
        </div>

        {confirming ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: 12 }}>
            <span style={{ color: 'var(--text2)' }}>Excluir?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ background: 'none', border: 'none', padding: 0, color: '#E57373', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Figtree', sans-serif" }}
            >
              {deleting ? 'Excluindo...' : 'Sim'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={deleting}
              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Figtree', sans-serif" }}
            >
              Não
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 14, color: '#C0B4D0', lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'break-word', marginTop: 2 }}>
              {comment.content}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{formatCommentDate(comment.created_at)}</div>
          </>
        )}
      </div>
    </div>
  )
}
