import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const THROTTLE_MS = 5 * 60 * 1000

export function useLastSeen(userId) {
  const lastUpdateRef = useRef(0)

  useEffect(() => {
    if (!userId) return

    function touch() {
      const now = Date.now()
      if (now - lastUpdateRef.current < THROTTLE_MS) return
      lastUpdateRef.current = now
      supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', userId)
    }

    touch()
    document.addEventListener('click', touch)
    document.addEventListener('visibilitychange', touch)
    return () => {
      document.removeEventListener('click', touch)
      document.removeEventListener('visibilitychange', touch)
    }
  }, [userId])
}
