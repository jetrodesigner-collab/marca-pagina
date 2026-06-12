import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ONLINE_THRESHOLD_MS = 24 * 60 * 60 * 1000

export function useCommunity(currentUserId) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, last_seen')
        .neq('id', currentUserId)
        .order('last_seen', { ascending: false })

      if (!active) return

      if (!profiles?.length) {
        setUsers([])
        setLoading(false)
        return
      }

      const ids = profiles.map(p => p.id)

      const [{ data: userItems }, { data: reviews }] = await Promise.all([
        supabase
          .from('user_items')
          .select('user_id, created_at, items(type, cover_url, title)')
          .in('user_id', ids)
          .order('created_at', { ascending: false }),
        supabase
          .from('reviews')
          .select('user_id')
          .in('user_id', ids),
      ])

      if (!active) return

      const booksCount = {}
      const moviesCount = {}
      const recentCovers = {}

      ;(userItems || []).forEach(ui => {
        if (ui.items?.type === 'book') booksCount[ui.user_id] = (booksCount[ui.user_id] || 0) + 1
        if (ui.items?.type === 'movie') moviesCount[ui.user_id] = (moviesCount[ui.user_id] || 0) + 1

        const list = recentCovers[ui.user_id] || (recentCovers[ui.user_id] = [])
        if (list.length < 3) list.push(ui.items)
      })

      const reviewsCount = {}
      ;(reviews || []).forEach(r => {
        reviewsCount[r.user_id] = (reviewsCount[r.user_id] || 0) + 1
      })

      const now = Date.now()
      const merged = profiles.map(p => ({
        id: p.id,
        username: p.username,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        books: booksCount[p.id] || 0,
        movies: moviesCount[p.id] || 0,
        reviews: reviewsCount[p.id] || 0,
        recentCovers: recentCovers[p.id] || [],
        online: !!p.last_seen && (now - new Date(p.last_seen).getTime()) < ONLINE_THRESHOLD_MS,
      }))

      setUsers(merged)
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [currentUserId])

  return { users, loading }
}
