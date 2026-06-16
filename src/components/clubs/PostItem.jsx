import { useState } from 'react'

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

function Avatar({ userId, profile, size = 26 }) {
  const color = colorFor(userId)
  const initial = ((profile?.full_name || profile?.username || '?')).charAt(0).toUpperCase()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color.bg,
        color: color.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.42,
        fontWeight: 700,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : initial}
    </div>
  )
}

function ReplyItem({ reply, currentUserId, onToggleLike }) {
  const liked = reply.likes?.some(l => l.user_id === currentUserId)
  const profile = reply.profile || {}
  const name = profile.full_name || profile.username || 'Usuário'

  return (
    <div className="cl-reply">
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Avatar userId={reply.user_id} profile={profile} size={18} />
        <span style={{ fontSize: 11, fontWeight: 600 }}>{name}</span>
        <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>{timeAgo(reply.criado_em)}</span>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(240,235,248,.62)', lineHeight: 1.5 }}>
        {reply.conteudo}
      </div>
      <button
        onClick={() => onToggleLike(reply.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 11,
          color: liked ? 'var(--accent)' : 'var(--muted)',
          fontFamily: 'Figtree, sans-serif',
          marginTop: 6,
          padding: 0,
        }}
      >
        ❤️ {reply.likes?.length || 0}
      </button>
    </div>
  )
}

export default function PostItem({ post, currentUserId, onToggleLike, onDelete, onReply, activeMeta, onCutucar }) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false)
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState('')

  const profile = post.profile || {}
  const name = profile.full_name || profile.username || 'Usuário'
  const liked = post.likes?.some(l => l.user_id === currentUserId)

  function handleReply() {
    if (!replyText.trim()) return
    onReply && onReply(post.id, replyText.trim())
    setReplyText('')
    setShowReplyInput(false)
  }

  if (post.tipo === 'progresso') {
    const pct = activeMeta?.pagina_fim
      ? Math.min(100, Math.round(((post.trecho_pagina || 0) / activeMeta.pagina_fim) * 100))
      : 0
    const isBehind = activeMeta && pct < 50
    const daysLeft = activeMeta?.data_limite
      ? Math.max(0, Math.ceil((new Date(activeMeta.data_limite) - new Date()) / (1000 * 60 * 60 * 24)))
      : null
    const showCutucar = isBehind && daysLeft !== null && daysLeft <= 3 && post.user_id !== currentUserId

    return (
      <div
        className="cl-prog-post"
        style={pct >= 100
          ? { borderColor: 'rgba(126,223,168,.25)', background: 'rgba(126,223,168,.04)' }
          : {}}
      >
        <Avatar userId={post.user_id} profile={profile} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'rgba(240,235,248,.62)' }}>
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{name}</strong>{' '}
            {pct >= 100
              ? `concluiu a meta 🎉 — pág. ${post.trecho_pagina}`
              : `está na pág. ${post.trecho_pagina}${isBehind ? ' — precisa acelerar' : ''}`}
          </div>
          <div className="cl-prog-bar-mini">
            <div style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 2,
              background: pct >= 100 ? '#7EDFA8' : pct >= 60 ? 'var(--accent)' : '#F07A7A',
            }} />
          </div>
          {post.conteudo && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>{post.conteudo}</div>
          )}
        </div>
        <span style={{ fontSize: 10, color: 'var(--muted)', alignSelf: 'flex-start' }}>{timeAgo(post.criado_em)}</span>
        {showCutucar && (
          <button
            onClick={() => onCutucar && onCutucar(post)}
            style={{
              fontFamily: 'Figtree, sans-serif',
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--accent)',
              background: 'rgba(196,168,240,.14)',
              border: 'none',
              borderRadius: 8,
              padding: '3px 8px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ⚡ Cutucar
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="cl-fi">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <Avatar userId={post.user_id} profile={profile} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{name}</span>
          {post.trecho_capitulo && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.4px', color: 'var(--muted)', textTransform: 'uppercase' }}>
              {post.trecho_capitulo}
            </span>
          )}
          <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>{timeAgo(post.criado_em)}</span>
        </div>

        {post.tipo === 'trecho' && post.trecho_texto && (
          post.is_spoiler && !spoilerRevealed ? (
            <div
              className="cl-spoiler"
              onClick={() => setSpoilerRevealed(true)}
            >
              <div style={{ filter: 'blur(4px)', userSelect: 'none', fontSize: 12, color: 'rgba(240,235,248,.62)', lineHeight: 1.55, fontStyle: 'italic' }}>
                {post.trecho_texto}
              </div>
              <div className="cl-spoiler-overlay">
                <div style={{ fontSize: 10, fontWeight: 700, color: '#F07A7A', letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 1 }}>⚠ Spoiler</div>
                <div style={{ fontSize: 9, color: 'var(--muted)' }}>Toque para revelar</div>
              </div>
            </div>
          ) : (
            <div className="cl-cited">
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.5px', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 5 }}>
                ✦ Trecho citado{post.trecho_pagina ? ` · pág. ${post.trecho_pagina}` : ''}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(240,235,248,.62)', lineHeight: 1.55, fontStyle: 'italic' }}>
                "{post.trecho_texto}"
              </div>
            </div>
          )
        )}

        {post.conteudo && (
          <div style={{ fontSize: 12, lineHeight: 1.62, color: 'var(--text)', marginBottom: 14 }}>
            {post.conteudo}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => onToggleLike(post.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: liked ? 'var(--accent)' : 'var(--muted)', fontFamily: 'Figtree, sans-serif', fontWeight: 500, padding: '2px 0' }}
          >
            ❤️ {post.likes?.length || 0}
          </button>
          <button
            onClick={() => setShowReplyInput(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--muted)', fontFamily: 'Figtree, sans-serif', fontWeight: 500, padding: '2px 0' }}
          >
            💬 {post.replies?.length ? `${post.replies.length} resposta${post.replies.length > 1 ? 's' : ''}` : 'Responder'}
          </button>
          {post.user_id === currentUserId && (
            <button
              onClick={() => onDelete && onDelete(post.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--muted)', fontFamily: 'Figtree, sans-serif', fontWeight: 500, padding: '2px 0', marginLeft: 'auto' }}
            >
              🗑
            </button>
          )}
        </div>

        {showReplyInput && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 12 }}>
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Escreva uma resposta..."
              onKeyDown={e => e.key === 'Enter' && handleReply()}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(196,168,240,.15)',
                borderRadius: 8,
                padding: '7px 10px',
                fontFamily: 'Figtree, sans-serif',
                fontSize: 12,
                color: 'var(--text)',
                outline: 'none',
              }}
            />
            <button
              onClick={handleReply}
              style={{
                background: 'var(--accent)',
                color: '#1A1720',
                border: 'none',
                borderRadius: 8,
                padding: '7px 12px',
                fontFamily: 'Figtree, sans-serif',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              OK
            </button>
          </div>
        )}
      </div>

      {post.replies && post.replies.length > 0 && (
        <div>
          {post.replies.map(reply => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              currentUserId={currentUserId}
              onToggleLike={onToggleLike}
            />
          ))}
        </div>
      )}
    </div>
  )
}
