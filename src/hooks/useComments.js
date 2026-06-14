import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const PROFILE_COLS = 'id, username, full_name, avatar_url'

async function attachProfiles(rows) {
  const userIds = [...new Set(rows.map(r => r.user_id))]
  if (!userIds.length) return rows
  const { data: profiles } = await supabase
    .from('profiles')
    .select(PROFILE_COLS)
    .in('id', userIds)
  const byId = new Map((profiles || []).map(p => [p.id, p]))
  return rows.map(r => ({ ...r, profiles: byId.get(r.user_id) || null }))
}

// target: { itemId } | { postId } | { reviewId }
function targetColumn(target) {
  if (target?.itemId) return ['item_id', target.itemId]
  if (target?.postId) return ['post_id', target.postId]
  if (target?.reviewId) return ['review_id', target.reviewId]
  return [null, null]
}

function updateNode(list, id, updater) {
  return list.map(c => {
    if (c.id === id) return updater(c)
    if (c.replies.some(r => r.id === id)) {
      return { ...c, replies: c.replies.map(r => r.id === id ? updater(r) : r) }
    }
    return c
  })
}

export function useComments(target, currentUserId) {
  const [col, val] = targetColumn(target)
  const [comments, setComments] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchComments = useCallback(async () => {
    if (!val) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('comments')
      .select('*')
      .eq(col, val)
      .order('created_at', { ascending: true })

    if (err) {
      setError(err)
      setComments([])
      setCount(0)
      setLoading(false)
      return
    }

    const rows = await attachProfiles(data || [])
    const ids = rows.map(r => r.id)

    const likeCounts = {}
    const likedByMe = new Set()
    if (ids.length) {
      const { data: likes } = await supabase
        .from('comment_likes')
        .select('comment_id, user_id')
        .in('comment_id', ids)
      ;(likes || []).forEach(l => {
        likeCounts[l.comment_id] = (likeCounts[l.comment_id] || 0) + 1
        if (l.user_id === currentUserId) likedByMe.add(l.comment_id)
      })
    }

    const byId = new Map()
    rows.forEach(r => byId.set(r.id, {
      ...r,
      replies: [],
      likeCount: likeCounts[r.id] || 0,
      likedByMe: likedByMe.has(r.id),
    }))

    const roots = []
    rows.forEach(r => {
      const node = byId.get(r.id)
      if (r.parent_id && byId.has(r.parent_id)) byId.get(r.parent_id).replies.push(node)
      else roots.push(node)
    })

    setComments(roots)
    setCount(rows.length)
    setLoading(false)
  }, [col, val, currentUserId])

  useEffect(() => { fetchComments() }, [fetchComments])

  // Realtime: adiciona comentários de outros usuários automaticamente
  useEffect(() => {
    if (!val) return
    const channel = supabase
      .channel(`comments-${col}-${val}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'comments', filter: `${col}=eq.${val}`,
      }, async payload => {
        const row = payload.new
        if (row.user_id === currentUserId) return
        const [withProfile] = await attachProfiles([row])
        const node = { ...withProfile, replies: [], likeCount: 0, likedByMe: false }
        setComments(prev => {
          const exists = prev.some(c => c.id === row.id || c.replies.some(r => r.id === row.id))
          if (exists) return prev
          if (row.parent_id) {
            return prev.map(c => c.id === row.parent_id ? { ...c, replies: [...c.replies, node] } : c)
          }
          return [...prev, node]
        })
        setCount(c => c + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [col, val, currentUserId])

  async function addComment(content, parentId = null) {
    const { data, error: err } = await supabase
      .from('comments')
      .insert({ user_id: currentUserId, content, parent_id: parentId, [col]: val })
      .select('*')
      .single()

    if (err || !data) return { error: err }

    const [withProfile] = await attachProfiles([data])
    const node = { ...withProfile, replies: [], likeCount: 0, likedByMe: false }
    setComments(prev => parentId
      ? prev.map(c => c.id === parentId ? { ...c, replies: [...c.replies, node] } : c)
      : [...prev, node]
    )
    setCount(c => c + 1)
    return { data: node }
  }

  async function deleteComment(commentId) {
    const { error: err } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (!err) {
      setComments(prev => {
        const target = prev.find(c => c.id === commentId)
        const repliesRemoved = target ? target.replies.length : prev.reduce((sum, c) => sum + (c.replies.some(r => r.id === commentId) ? 1 : 0), 0)
        setCount(c => c - 1 - repliesRemoved)
        return prev
          .filter(c => c.id !== commentId)
          .map(c => ({ ...c, replies: c.replies.filter(r => r.id !== commentId) }))
      })
    }
    return { error: err }
  }

  async function toggleLike(commentId) {
    let wasLiked = false
    setComments(prev => updateNode(prev, commentId, node => {
      wasLiked = node.likedByMe
      return { ...node, likedByMe: !wasLiked, likeCount: node.likeCount + (wasLiked ? -1 : 1) }
    }))

    if (wasLiked) {
      await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', currentUserId)
    } else {
      await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: currentUserId })
    }
  }

  return { comments, count, loading, error, addComment, deleteComment, toggleLike, fetchComments }
}
