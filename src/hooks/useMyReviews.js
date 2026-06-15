import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useMyReviews(userId) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*, items(id, title, type, cover_url)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    const itemIds = (reviewsData || []).map(r => r.item_id)
    let userItemsById = {}
    if (itemIds.length > 0) {
      const { data: userItemsData } = await supabase
        .from('user_items')
        .select('*')
        .eq('user_id', userId)
        .in('item_id', itemIds)
      userItemsById = Object.fromEntries((userItemsData || []).map(ui => [ui.item_id, ui]))
    }

    setReviews((reviewsData || []).map(r => ({
      ...r,
      rating: userItemsById[r.item_id]?.rating || 0,
      userItem: userItemsById[r.item_id] || null,
    })))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  async function deleteReview(reviewId) {
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
    if (!error) setReviews(prev => prev.filter(r => r.id !== reviewId))
    return { error }
  }

  return { reviews, loading, deleteReview }
}
