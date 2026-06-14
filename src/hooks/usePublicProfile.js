import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function usePublicProfile(userId, currentUserId) {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ books: 0, movies: 0, reviews: 0 })
  const [recentBooks, setRecentBooks] = useState([])
  const [recentMovies, setRecentMovies] = useState([])
  const [publicReviews, setPublicReviews] = useState([])
  const [privateReviews, setPrivateReviews] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    const [{ data: profileData }, { data: userItems }, { data: reviewsData }, { data: postsData }] = await Promise.all([
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
      supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ])

    const items = userItems || []
    const books  = items.filter(ui => ui.items?.type === 'book').length
    const movies = items.filter(ui => ui.items?.type === 'movie').length
    const recentBooksList  = items.filter(ui => ui.status === 'read' && ui.items?.type === 'book')
    const recentMoviesList = items.filter(ui => ui.status === 'watched' && ui.items?.type === 'movie')

    const allReviews = reviewsData || []
    const publicR  = allReviews.filter(r => r.is_public)
    const privateR = allReviews.filter(r => !r.is_public)

    let publicReviewsWithMeta = publicR
    if (publicR.length) {
      const reviewIds = publicR.map(r => r.id)
      const [{ data: rLikes }, { data: rComments }] = await Promise.all([
        supabase.from('review_likes').select('review_id, user_id').in('review_id', reviewIds),
        supabase.from('comments').select('review_id').in('review_id', reviewIds),
      ])

      const likeCounts = {}
      const likedByMe = new Set()
      ;(rLikes || []).forEach(l => {
        likeCounts[l.review_id] = (likeCounts[l.review_id] || 0) + 1
        if (l.user_id === currentUserId) likedByMe.add(l.review_id)
      })

      const commentCounts = {}
      ;(rComments || []).forEach(c => {
        commentCounts[c.review_id] = (commentCounts[c.review_id] || 0) + 1
      })

      publicReviewsWithMeta = publicR.map(r => ({
        ...r,
        likeCount: likeCounts[r.id] || 0,
        likedByMe: likedByMe.has(r.id),
        commentCount: commentCounts[r.id] || 0,
      }))
    }

    let postsWithMeta = []
    const postsRows = postsData || []
    if (postsRows.length) {
      const postIds = postsRows.map(p => p.id)
      const [{ data: pLikes }, { data: pComments }] = await Promise.all([
        supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds),
        supabase.from('comments').select('post_id').in('post_id', postIds),
      ])

      const likeCounts = {}
      const likedByMe = new Set()
      ;(pLikes || []).forEach(l => {
        likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1
        if (l.user_id === currentUserId) likedByMe.add(l.post_id)
      })

      const commentCounts = {}
      ;(pComments || []).forEach(c => {
        commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1
      })

      postsWithMeta = postsRows.map(p => ({
        ...p,
        profiles: profileData || null,
        likeCount: likeCounts[p.id] || 0,
        likedByMe: likedByMe.has(p.id),
        commentCount: commentCounts[p.id] || 0,
      }))
    }

    setProfile(profileData)
    setStats({ books, movies, reviews: publicReviewsWithMeta.length })
    setRecentBooks(recentBooksList)
    setRecentMovies(recentMoviesList)
    setPublicReviews(publicReviewsWithMeta)
    setPrivateReviews(privateR)
    setPosts(postsWithMeta)
    setLoading(false)
  }, [userId, currentUserId])

  useEffect(() => {
    let active = true
    load().then(() => { if (!active) return })
    return () => { active = false }
  }, [load])

  async function toggleReviewLike(reviewId) {
    let wasLiked = false
    setPublicReviews(prev => prev.map(r => {
      if (r.id !== reviewId) return r
      wasLiked = r.likedByMe
      return { ...r, likedByMe: !wasLiked, likeCount: r.likeCount + (wasLiked ? -1 : 1) }
    }))

    if (wasLiked) {
      await supabase.from('review_likes').delete().eq('review_id', reviewId).eq('user_id', currentUserId)
    } else {
      await supabase.from('review_likes').insert({ review_id: reviewId, user_id: currentUserId })
    }
  }

  async function togglePostLike(postId) {
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

  return {
    profile, stats, recentBooks, recentMovies, publicReviews, privateReviews, posts, loading,
    toggleReviewLike, togglePostLike,
  }
}
