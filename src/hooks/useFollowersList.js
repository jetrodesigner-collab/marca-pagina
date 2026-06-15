import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useFollowersList(userId) {
  const [followers, setFollowers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    const { data: rows } = await supabase
      .from('follows')
      .select('follower_id, created_at')
      .eq('following_id', userId)
      .order('created_at', { ascending: false })

    const followerIds = (rows || []).map(r => r.follower_id)
    if (!followerIds.length) {
      setFollowers([])
      setLoading(false)
      return
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', followerIds)

    const profileById = new Map((profiles || []).map(p => [p.id, p]))
    setFollowers(rows.map(r => profileById.get(r.follower_id)).filter(Boolean))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    let active = true
    load().then(() => { if (!active) return })
    return () => { active = false }
  }, [load])

  return { followers, loading }
}
