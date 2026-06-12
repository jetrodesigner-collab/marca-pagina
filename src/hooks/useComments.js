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

export function useComments(itemId, userId) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchComments = useCallback(async () => {
    if (!itemId) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('comments')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })

    if (err) {
      setError(err)
      setComments([])
      setLoading(false)
      return
    }

    setComments(await attachProfiles(data || []))
    setLoading(false)
  }, [itemId])

  useEffect(() => { fetchComments() }, [fetchComments])

  // Realtime: adiciona comentários de outros usuários automaticamente
  useEffect(() => {
    if (!itemId) return
    const channel = supabase
      .channel(`comments-${itemId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'comments', filter: `item_id=eq.${itemId}`,
      }, async payload => {
        const row = payload.new
        if (row.user_id === userId) return
        const [withProfile] = await attachProfiles([row])
        setComments(prev => prev.some(c => c.id === row.id) ? prev : [withProfile, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [itemId, userId])

  async function addComment(content, currentUserId) {
    const { data, error: err } = await supabase
      .from('comments')
      .insert({ user_id: currentUserId, item_id: itemId, content })
      .select('*')
      .single()

    if (err || !data) return { error: err }

    const [withProfile] = await attachProfiles([data])
    setComments(prev => [withProfile, ...prev])
    return { data: withProfile }
  }

  async function deleteComment(commentId) {
    const { error: err } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (!err) setComments(prev => prev.filter(c => c.id !== commentId))
    return { error: err }
  }

  return { comments, loading, error, addComment, deleteComment, fetchComments }
}
