import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useClubPosts(clubId, userId) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!clubId) return
    setLoading(true)

    // 1. Posts raiz (sem o parent_id para evitar problema de FK no PostgREST)
    const { data: postsData, error: postsError } = await supabase
      .from('club_posts')
      .select('*')
      .eq('club_id', clubId)
      .is('parent_id', null)
      .order('criado_em', { ascending: false })

    if (postsError) {
      console.error('[useClubPosts] posts error:', postsError)
      setPosts([])
      setLoading(false)
      return
    }

    const rootPosts = postsData || []
    console.log(`[useClubPosts] ${rootPosts.length} posts para club_id=${clubId}`)

    if (rootPosts.length === 0) {
      setPosts([])
      setLoading(false)
      return
    }

    const postIds = rootPosts.map(p => p.id)
    const rootUserIds = [...new Set(rootPosts.map(p => p.user_id))]

    // 2. Replies, likes e profiles em paralelo
    const [
      { data: repliesRaw },
      { data: likesRaw },
      { data: profilesRaw },
    ] = await Promise.all([
      supabase
        .from('club_posts')
        .select('*')
        .in('parent_id', postIds)
        .order('criado_em', { ascending: true }),
      supabase
        .from('club_post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds),
      supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', rootUserIds),
    ])

    const replies = repliesRaw || []
    const replyIds = replies.map(r => r.id)
    const replyUserIds = [...new Set(replies.map(r => r.user_id))]

    // 3. Likes das replies + profiles extras (autores das replies)
    const [replyLikesRes, extraProfilesRes] = await Promise.all([
      replyIds.length
        ? supabase.from('club_post_likes').select('post_id, user_id').in('post_id', replyIds)
        : Promise.resolve({ data: [] }),
      replyUserIds.length
        ? supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', replyUserIds)
        : Promise.resolve({ data: [] }),
    ])

    // 4. Monta maps
    const profileMap = {}
    ;[...(profilesRaw || []), ...(extraProfilesRes.data || [])].forEach(p => {
      profileMap[p.id] = p
    })

    const likesMap = {}
    ;[...(likesRaw || []), ...(replyLikesRes.data || [])].forEach(l => {
      if (!likesMap[l.post_id]) likesMap[l.post_id] = []
      likesMap[l.post_id].push({ user_id: l.user_id })
    })

    const repliesMap = {}
    replies.forEach(r => {
      if (!repliesMap[r.parent_id]) repliesMap[r.parent_id] = []
      repliesMap[r.parent_id].push({
        ...r,
        profile: profileMap[r.user_id] || null,
        likes: likesMap[r.id] || [],
      })
    })

    // 5. Monta posts finais com profile, likes e replies embutidos
    setPosts(rootPosts.map(p => ({
      ...p,
      profile: profileMap[p.user_id] || null,
      likes: likesMap[p.id] || [],
      replies: repliesMap[p.id] || [],
    })))
    setLoading(false)
  }, [clubId])

  useEffect(() => { load() }, [load])

  // Realtime: atualiza o feed para todos os membros ao vivo
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
    const { data, error } = await supabase
      .from('club_posts')
      .insert({
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
      .select('id, tipo, criado_em')
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
