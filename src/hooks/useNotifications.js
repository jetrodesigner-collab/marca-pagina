import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

async function attachMeta(rows) {
  if (!rows.length) return rows

  const itemIds  = [...new Set(rows.map(r => r.item_id).filter(Boolean))]
  const actorIds = [...new Set(rows.map(r => r.actor_id).filter(Boolean))]

  const [{ data: items }, { data: profiles }] = await Promise.all([
    itemIds.length
      ? supabase.from('items').select('id, title, type').in('id', itemIds)
      : Promise.resolve({ data: [] }),
    actorIds.length
      ? supabase.from('profiles').select('id, username, avatar_url').in('id', actorIds)
      : Promise.resolve({ data: [] }),
  ])

  const itemsById    = new Map((items || []).map(i => [i.id, i]))
  const profilesById = new Map((profiles || []).map(p => [p.id, p]))

  return rows.map(r => ({
    ...r,
    items: itemsById.get(r.item_id) || null,
    profiles: profilesById.get(r.actor_id) || null,
  }))
}

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })

    setNotifications(await attachMeta(data || []))
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  // Realtime: adiciona novas notificações automaticamente
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}`,
      }, async payload => {
        const [withMeta] = await attachMeta([payload.new])
        setNotifications(prev => [withMeta, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function markAllAsRead() {
    const ids = notifications.filter(n => !n.read).map(n => n.id)
    if (!userId || ids.length === 0) return
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).in('id', ids)
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount, markAllAsRead, loading }
}
