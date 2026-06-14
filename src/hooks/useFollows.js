import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useFollows(currentUserId) {
  const [following, setFollowing] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId)
      .then(({ data }) => {
        if (!active) return
        setFollowing(new Set((data || []).map(f => f.following_id)))
        setLoading(false)
      })
    return () => { active = false }
  }, [currentUserId])

  async function toggleFollow(userId) {
    const isFollowing = following.has(userId)
    setFollowing(prev => {
      const next = new Set(prev)
      if (isFollowing) next.delete(userId)
      else next.add(userId)
      return next
    })

    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', userId)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: userId })
    }
  }

  return { following, loading, toggleFollow }
}
