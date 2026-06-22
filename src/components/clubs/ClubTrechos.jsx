import { useState, useEffect, useCallback } from 'react'
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
  const [showAddForm, setShowAddForm] = useState(false)
  const [addText, setAddText] = useState('')
  const [addPagina, setAddPagina] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    if (!clubId) return
    setLoading(true)

    // 1. Posts de tipo 'trecho' — sem FK hints (club_posts.user_id → auth.users, não profiles)
    const { data: postsData } = await supabase
      .from('club_posts')
      .select('*')
      .eq('club_id', clubId)
      .eq('tipo', 'trecho')
      .is('parent_id', null)
      .order('criado_em', { ascending: false })

    const items = postsData || []

    if (items.length === 0) {
      setTrechos([])
      setLiked(new Set())
      setLoading(false)
      return
    }

    const postIds = items.map(p => p.id)
    const userIds = [...new Set(items.map(p => p.user_id))]

    // 2. Likes, perfis e replies em paralelo — queries separadas
    const [{ data: likesData }, { data: profilesData }, { data: repliesData }] = await Promise.all([
      supabase.from('club_post_likes').select('post_id, user_id').in('post_id', postIds),
      supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', userIds),
      supabase.from('club_posts').select('id, parent_id').in('parent_id', postIds),
    ])

    // 3. Montar maps
    const profileMap = {}
    ;(profilesData || []).forEach(p => { profileMap[p.id] = p })

    const likesMap = {}
    ;(likesData || []).forEach(l => {
      if (!likesMap[l.post_id]) likesMap[l.post_id] = []
      likesMap[l.post_id].push({ user_id: l.user_id })
    })

    const repliesMap = {}
    ;(repliesData || []).forEach(r => {
      if (!repliesMap[r.parent_id]) repliesMap[r.parent_id] = []
      repliesMap[r.parent_id].push(r)
    })

    // 4. Merge final
    const merged = items.map(p => ({
      ...p,
      profile: profileMap[p.user_id] || null,
      likes: likesMap[p.id] || [],
      replies: repliesMap[p.id] || [],
    }))

    setTrechos(merged)
    setLiked(new Set(merged.filter(p => p.likes.some(l => l.user_id === currentUserId)).map(p => p.id)))
    setLoading(false)
  }, [clubId, currentUserId])

  useEffect(() => { load() }, [load])

  // Realtime: novos trechos postados no Feed aparecem aqui automaticamente
  useEffect(() => {
    if (!clubId) return
    const channel = supabase
      .channel(`club_trechos_${clubId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'club_posts',
        filter: `club_id=eq.${clubId}`,
      }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clubId, load])

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

  async function addTrecho() {
    if (!addText.trim()) return
    setAdding(true)
    try {
      const { error } = await supabase.from('club_posts').insert({
        club_id: clubId,
        user_id: currentUserId,
        tipo: 'trecho',
        trecho_texto: addText.trim(),
        trecho_pagina: addPagina ? parseInt(addPagina) : null,
        conteudo: null,
        is_spoiler: false,
      })
      if (error) throw error
      setAddText('')
      setAddPagina('')
      setShowAddForm(false)
    } catch {
      // realtime dispara o load automaticamente
    } finally {
      setAdding(false)
    }
  }

  return (
    <div style={{ padding: '28px 22px 120px' }}>

      {/* Botão + Adicionar trecho / formulário inline */}
      <div style={{ marginBottom: 20 }}>
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: 'var(--accent)',
              background: 'rgba(196,168,240,.07)',
              border: '1px dashed rgba(196,168,240,.3)',
              borderRadius: 12, padding: '11px 16px',
              cursor: 'pointer', fontFamily: 'Figtree, sans-serif', width: '100%',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
            </svg>
            Adicionar trecho
          </button>
        ) : (
          <div style={{ background: 'var(--sur)', border: '1px solid rgba(196,168,240,.2)', borderRadius: 14, padding: 16 }}>
            <textarea
              placeholder="Cole ou escreva o trecho do livro..."
              value={addText}
              onChange={e => setAddText(e.target.value)}
              rows={4}
              autoFocus
              style={{
                width: '100%', background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(196,168,240,.15)', borderRadius: 8,
                padding: '10px', fontFamily: 'Figtree, sans-serif',
                fontSize: 13, color: 'var(--text)', outline: 'none',
                resize: 'none', marginBottom: 10, fontStyle: 'italic',
                boxSizing: 'border-box',
              }}
            />
            <input
              type="number"
              placeholder="Página (opcional)"
              value={addPagina}
              onChange={e => setAddPagina(e.target.value)}
              style={{
                width: '100%', background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(196,168,240,.15)', borderRadius: 8,
                padding: '7px 10px', fontFamily: 'Figtree, sans-serif',
                fontSize: 12, color: 'var(--text)', outline: 'none',
                marginBottom: 12, boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setShowAddForm(false); setAddText(''); setAddPagina('') }}
                className="post-cancel-btn"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                onClick={addTrecho}
                disabled={adding || !addText.trim()}
                className="post-publish-btn"
                style={{ flex: 2, opacity: (!addText.trim() || adding) ? .5 : 1 }}
              >
                {adding ? 'Salvando...' : 'Salvar trecho'}
              </button>
            </div>
          </div>
        )}
      </div>

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
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)' }}>
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
