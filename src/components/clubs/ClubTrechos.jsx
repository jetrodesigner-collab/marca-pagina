import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const MEMBER_COLORS = [
  { bg: 'rgba(196,168,240,.14)', color: '#C4A8F0' },
  { bg: 'rgba(126,223,168,.13)', color: '#7EDFA8' },
  { bg: 'rgba(240,201,122,.13)', color: '#F0C97A' },
  { bg: 'rgba(240,122,122,.13)', color: '#F07A7A' },
  { bg: 'rgba(122,170,206,.13)', color: '#7AAACE' },
]

function colorFor(id) {
  let h = 0
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) % MEMBER_COLORS.length
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length]
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  if (diff < 172800) return 'ontem'
  return new Date(ts).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export default function ClubTrechos({ clubId, currentUserId }) {
  const [trechos, setTrechos] = useState([])
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(new Set())

  useEffect(() => {
    if (!clubId) return
    load()
  }, [clubId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('club_posts')
      .select(`
        *,
        profile:profiles!user_id (id, full_name, username, avatar_url),
        likes:club_post_likes (user_id),
        replies:club_posts!parent_id (id)
      `)
      .eq('club_id', clubId)
      .eq('tipo', 'trecho')
      .is('parent_id', null)
      .order('likes_count', { ascending: false })

    const items = data || []
    setTrechos(items)
    setLiked(new Set(items.filter(p => p.likes?.some(l => l.user_id === currentUserId)).map(p => p.id)))
    setLoading(false)
  }

  async function toggleLike(postId) {
    const isLiked = liked.has(postId)
    if (isLiked) {
      await supabase.from('club_post_likes').delete().eq('post_id', postId).eq('user_id', currentUserId)
      setLiked(s => { const n = new Set(s); n.delete(postId); return n })
      setTrechos(t => t.map(p => p.id === postId ? { ...p, likes: (p.likes || []).filter(l => l.user_id !== currentUserId) } : p))
    } else {
      await supabase.from('club_post_likes').insert({ post_id: postId, user_id: currentUserId })
      setLiked(s => new Set([...s, postId]))
      setTrechos(t => t.map(p => p.id === postId ? { ...p, likes: [...(p.likes || []), { user_id: currentUserId }] } : p))
    }
  }

  return (
    <div style={{ padding: '28px 22px 120px' }}>
      {loading && (
        <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--muted)' }}>
          Carregando...
        </div>
      )}

      {!loading && trechos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--muted)' }}>
          Nenhum trecho compartilhado ainda.
        </div>
      )}

      {trechos.map(post => {
        const profile = post.profile || {}
        const name = profile.full_name || profile.username || 'Usuário'
        const color = colorFor(post.user_id)
        const isLiked = liked.has(post.id)
        const initial = name.charAt(0).toUpperCase()

        return (
          <div key={post.id} className="cl-exc-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: color.bg, color: color.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{name}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>{timeAgo(post.criado_em)}</span>
            </div>

            {(post.trecho_pagina || post.trecho_capitulo) && (
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '.4px', marginBottom: 12 }}>
                ✦ {post.trecho_pagina ? `Página ${post.trecho_pagina}` : ''}
                {post.trecho_pagina && post.trecho_capitulo ? ' · ' : ''}
                {post.trecho_capitulo || ''}
              </div>
            )}

            <div className="cl-exc-body">
              "{post.trecho_texto}"
            </div>

            {post.conteudo && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
                {post.conteudo}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)', cursor: 'pointer' }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H2a1 1 0 00-1 1v9a1 1 0 001 1h3l3 3 3-3h3a1 1 0 001-1V3a1 1 0 00-1-1z"/>
                </svg>
                {post.replies?.length || 0} comentário{post.replies?.length !== 1 ? 's' : ''}
              </div>
              <button
                onClick={() => toggleLike(post.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                  color: isLiked ? 'var(--accent)' : 'var(--muted)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Figtree, sans-serif',
                }}
              >
                ❤️ {post.likes?.length || 0}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
