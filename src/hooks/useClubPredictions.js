import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useClubPredictions(clubId, metaId, currentUserId) {
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(false)
  const [myPrediction, setMyPrediction] = useState(null)

  useEffect(() => {
    if (!clubId) return
    load()
  }, [clubId, metaId])

  async function load() {
    setLoading(true)
    try {
      let q = supabase
        .from('club_predictions')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })

      if (metaId) q = q.eq('meta_id', metaId)

      const { data } = await q

      if (!data?.length) {
        setPredictions([])
        setMyPrediction(null)
        return
      }

      const userIds = [...new Set(data.map(p => p.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', userIds)

      const profileMap = {}
      profiles?.forEach(p => { profileMap[p.id] = p })

      const withProfiles = data.map(p => ({ ...p, profile: profileMap[p.user_id] || null }))
      setPredictions(withProfiles)
      setMyPrediction(withProfiles.find(p => p.user_id === currentUserId) || null)
    } catch (err) {
      console.error('[useClubPredictions]', err)
    } finally {
      setLoading(false)
    }
  }

  async function addPrediction(content) {
    await supabase.from('club_predictions').insert({
      club_id: clubId,
      meta_id: metaId || null,
      user_id: currentUserId,
      content,
    })
    await load()
  }

  async function revealAll() {
    let q = supabase
      .from('club_predictions')
      .update({ revealed: true })
      .eq('club_id', clubId)

    if (metaId) q = q.eq('meta_id', metaId)

    await q
    await load()
  }

  async function markCorrect(id) {
    await supabase
      .from('club_predictions')
      .update({ correct: true })
      .eq('id', id)
    await load()
  }

  return { predictions, loading, myPrediction, addPrediction, revealAll, markCorrect, refresh: load }
}
