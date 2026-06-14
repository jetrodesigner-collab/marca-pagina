import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// filterUserId: opcional — se informado, retorna apenas posts desse usuário
export function usePosts(currentUserId, filterUserId = null) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (filterUserId) query = query.eq('user_id', filterUserId)
    const { data: rows } = await query

    if (!rows?.length) {
      setPosts([])
      setLoading(false)
      return
    }

    const ids = rows.map(r => r.id)
    const userIds = [...new Set(rows.map(r => r.user_id))]

    const [{ data: profiles }, { data: likes }, { data: comments }] = await Promise.all([
      supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds),
      supabase.from('post_likes').select('post_id, user_id').in('post_id', ids),
      supabase.from('comments').select('post_id').in('post_id', ids),
    ])

    const profileById = new Map((profiles || []).map(p => [p.id, p]))

    const likeCounts = {}
    const likedByMe = new Set()
    ;(likes || []).forEach(l => {
      likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1
      if (l.user_id === currentUserId) likedByMe.add(l.post_id)
    })

    const commentCounts = {}
    ;(comments || []).forEach(c => {
      commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1
    })

    setPosts(rows.map(r => ({
      ...r,
      profiles: profileById.get(r.user_id) || null,
      likeCount: likeCounts[r.id] || 0,
      likedByMe: likedByMe.has(r.id),
      commentCount: commentCounts[r.id] || 0,
    })))
    setLoading(false)
  }, [currentUserId, filterUserId])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function toggleLike(postId) {
    let wasLiked = false
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      wasLiked = p.likedByMe
      return { ...p, likedByMe: !wasLiked, likeCount: p.likeCount + (wasLiked ? -1 : 1) }
    }))

    if (wasLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUserId)
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUserId })
    }
  }

  async function deletePost(postId) {
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (!error) setPosts(prev => prev.filter(p => p.id !== postId))
    return { error }
  }

  return { posts, loading, toggleLike, deletePost, refetch: fetchPosts }
}
