import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useClubPageBets(clubId, metaId, currentUserId) {
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clubId || !metaId) return
    load()
  }, [clubId, metaId])

  async function load() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('club_page_bets')
        .select('*')
        .eq('club_id', clubId)
        .eq('meta_id', metaId)
        .order('created_at', { ascending: true })

      setBets(data || [])
    } catch (err) {
      console.error('[useClubPageBets]', err)
      setBets([])
    } finally {
      setLoading(false)
    }
  }

  async function placeBet(betPages) {
    await supabase.from('club_page_bets').upsert({
      club_id: clubId,
      meta_id: metaId,
      user_id: currentUserId,
      bet_pages: betPages,
    }, { onConflict: 'club_id,meta_id,user_id' })
    await load()
  }

  async function updateBet(betPages) {
    await supabase
      .from('club_page_bets')
      .update({ bet_pages: betPages })
      .eq('club_id', clubId)
      .eq('meta_id', metaId)
      .eq('user_id', currentUserId)
    await load()
  }

  return { bets, loading, placeBet, updateBet, refresh: load }
}
