import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useMyComments(userId) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    supabase
      .from('comments')
      .select('*, items(id,title,type), posts(id,title,user_id), reviews(id,user_id,items(id,title,type))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!active) return
        setComments(data || [])
        setLoading(false)
      })
    return () => { active = false }
  }, [userId])

  return { comments, loading }
}
