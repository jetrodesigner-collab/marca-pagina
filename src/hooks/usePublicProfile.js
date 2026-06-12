import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function usePublicProfile(userId) {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ books: 0, movies: 0, reviews: 0 })
  const [recentItems, setRecentItems] = useState([])
  const [publicReviews, setPublicReviews] = useState([])
  const [privateReviews, setPrivateReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)

      const [{ data: profileData }, { data: userItems }, { data: reviewsData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, bio, link_1, link_2')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('user_items')
          .select('status, created_at, items(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('reviews')
          .select('*, items(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ])

      if (!active) return

      const items = userItems || []
      const books  = items.filter(ui => ui.items?.type === 'book').length
      const movies = items.filter(ui => ui.items?.type === 'movie').length
      const recent = items.filter(ui => ui.status === 'read' || ui.status === 'watched')

      const allReviews   = reviewsData || []
      const publicR  = allReviews.filter(r => r.is_public)
      const privateR = allReviews.filter(r => !r.is_public)

      setProfile(profileData)
      setStats({ books, movies, reviews: publicR.length })
      setRecentItems(recent)
      setPublicReviews(publicR)
      setPrivateReviews(privateR)
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [userId])

  return { profile, stats, recentItems, publicReviews, privateReviews, loading }
}
