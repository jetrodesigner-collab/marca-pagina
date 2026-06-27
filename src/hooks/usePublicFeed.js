import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function usePublicFeed(currentUserId) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFeed = useCallback(async () => {
    setLoading(true)

    const [{ data: postRows }, { data: reviewRows }] = await Promise.all([
      supabase.from('posts').select('*').order('created_at', { ascending: false }),
      supabase
        .from('reviews')
        .select('*, items(id, title, type, cover_url)')
        .eq('is_public', true)
        .order('created_at', { ascending: false }),
    ])

    const posts = postRows || []
    const reviews = reviewRows || []

    const allUserIds = [...new Set([...posts.map(p => p.user_id), ...reviews.map(r => r.user_id)])]
    const postIds = posts.map(p => p.id)
    const reviewIds = reviews.map(r => r.id)
    const reviewItemIds = reviews.map(r => r.item_id)

    const [
      { data: profiles },
      { data: postLikes },
      { data: postComments },
      { data: reviewLikes },
      { data: reviewComments },
      { data: userItemsData },
    ] = await Promise.all([
      allUserIds.length
        ? supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', allUserIds)
        : Promise.resolve({ data: [] }),
      postIds.length
        ? supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds)
        : Promise.resolve({ data: [] }),
      postIds.length
        ? supabase.from('comments').select('post_id').in('post_id', postIds)
        : Promise.resolve({ data: [] }),
      reviewIds.length
        ? supabase.from('review_likes').select('review_id, user_id').in('review_id', reviewIds)
        : Promise.resolve({ data: [] }),
      reviewIds.length
        ? supabase.from('comments').select('review_id').in('review_id', reviewIds)
        : Promise.resolve({ data: [] }),
      reviewItemIds.length
        ? supabase.from('user_items').select('item_id, user_id, rating').in('item_id', reviewItemIds)
        : Promise.resolve({ data: [] }),
    ])

    const profileById = new Map((profiles || []).map(p => [p.id, p]))

    const postLikeCounts = {}
    const postLikedByMe = new Set()
    ;(postLikes || []).forEach(l => {
      postLikeCounts[l.post_id] = (postLikeCounts[l.post_id] || 0) + 1
      if (l.user_id === currentUserId) postLikedByMe.add(l.post_id)
    })
    const postCommentCounts = {}
    ;(postComments || []).forEach(c => {
      postCommentCounts[c.post_id] = (postCommentCounts[c.post_id] || 0) + 1
    })

    const reviewLikeCounts = {}
    const reviewLikedByMe = new Set()
    ;(reviewLikes || []).forEach(l => {
      reviewLikeCounts[l.review_id] = (reviewLikeCounts[l.review_id] || 0) + 1
      if (l.user_id === currentUserId) reviewLikedByMe.add(l.review_id)
    })
    const reviewCommentCounts = {}
    ;(reviewComments || []).forEach(c => {
      reviewCommentCounts[c.review_id] = (reviewCommentCounts[c.review_id] || 0) + 1
    })

    // Rating lookup: author's own rating for the reviewed item
    const ratingByKey = new Map(
      (userItemsData || []).map(ui => [`${ui.user_id}:${ui.item_id}`, ui.rating])
    )

    const feedPosts = posts.map(p => ({
      ...p,
      kind: 'post',
      profiles: profileById.get(p.user_id) || null,
      likeCount: postLikeCounts[p.id] || 0,
      likedByMe: postLikedByMe.has(p.id),
      commentCount: postCommentCounts[p.id] || 0,
    }))

    const feedReviews = reviews.map(r => ({
      ...r,
      kind: 'review',
      profiles: profileById.get(r.user_id) || null,
      likeCount: reviewLikeCounts[r.id] || 0,
      likedByMe: reviewLikedByMe.has(r.id),
      commentCount: reviewCommentCounts[r.id] || 0,
      rating: ratingByKey.get(`${r.user_id}:${r.item_id}`) || 0,
    }))

    const feed = [...feedPosts, ...feedReviews].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )

    setItems(feed)
    setLoading(false)
  }, [currentUserId])

  useEffect(() => { fetchFeed() }, [fetchFeed])

  async function toggleLikePost(postId) {
    let wasLiked = false
    setItems(prev => prev.map(item => {
      if (item.kind !== 'post' || item.id !== postId) return item
      wasLiked = item.likedByMe
      return { ...item, likedByMe: !wasLiked, likeCount: item.likeCount + (wasLiked ? -1 : 1) }
    }))
    if (wasLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUserId)
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUserId })
    }
  }

  async function toggleLikeReview(reviewId) {
    let wasLiked = false
    setItems(prev => prev.map(item => {
      if (item.kind !== 'review' || item.id !== reviewId) return item
      wasLiked = item.likedByMe
      return { ...item, likedByMe: !wasLiked, likeCount: item.likeCount + (wasLiked ? -1 : 1) }
    }))
    if (wasLiked) {
      await supabase.from('review_likes').delete().eq('review_id', reviewId).eq('user_id', currentUserId)
    } else {
      await supabase.from('review_likes').insert({ review_id: reviewId, user_id: currentUserId })
    }
  }

  async function deletePost(postId) {
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (!error) setItems(prev => prev.filter(item => !(item.kind === 'post' && item.id === postId)))
    return { error }
  }

  return { items, loading, toggleLikePost, toggleLikeReview, deletePost, refetch: fetchFeed }
}
