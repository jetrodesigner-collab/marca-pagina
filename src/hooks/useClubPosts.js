import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useClubPosts(clubId, userId) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!clubId) return
    setLoading(true)

    const { data, error } = await supabase
      .from('club_posts')
      .select(`
        *,
        profile:profiles!user_id (id, full_name, username, avatar_url),
        likes:club_post_likes (user_id),
        replies:club_posts!parent_id (
          *,
          profile:profiles!user_id (id, full_name, username, avatar_url),
          likes:club_post_likes (user_id)
        )
      `)
      .eq('club_id', clubId)
      .is('parent_id', null)
      .order('criado_em', { ascending: false })

    if (error) console.error('[useClubPosts] SELECT error:', error)
    setPosts(data || [])
    setLoading(false)
  }, [clubId])

  useEffect(() => { load() }, [load])

  // Realtime: atualiza o feed para todos os membros do clube
  useEffect(() => {
    if (!clubId) return
    const channel = supabase
      .channel(`club_posts_${clubId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'club_posts', filter: `club_id=eq.${clubId}` },
        () => load()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clubId, load])

  async function addPost({ tipo, conteudo, trecho_texto, trecho_pagina, trecho_capitulo, parent_id, is_spoiler }) {
    const { data, error } = await supabase.from('club_posts').insert({
      club_id: clubId,
      user_id: userId,
      tipo: tipo || 'comentario',
      conteudo: conteudo || null,
      trecho_texto: trecho_texto || null,
      trecho_pagina: trecho_pagina || null,
      trecho_capitulo: trecho_capitulo || null,
      parent_id: parent_id || null,
      is_spoiler: is_spoiler || false,
    })
    console.log('[addPost] INSERT resultado:', { data, error })
    if (error) throw error
    await load()
  }

  async function toggleLike(postId) {
    const allPosts = [...posts, ...posts.flatMap(p => p.replies || [])]
    const post = allPosts.find(p => p.id === postId)
    const liked = post?.likes?.some(l => l.user_id === userId)
    if (liked) {
      await supabase.from('club_post_likes').delete().eq('post_id', postId).eq('user_id', userId)
    } else {
      await supabase.from('club_post_likes').insert({ post_id: postId, user_id: userId })
    }
    await load()
  }

  async function deletePost(postId) {
    await supabase.from('club_posts').delete().eq('id', postId).eq('user_id', userId)
    await load()
  }

  return { posts, loading, addPost, toggleLike, deletePost, refresh: load }
}
