import { useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useStreak() {
  const updateStreak = useCallback(async (userId, clubId, novaPagina) => {
    const { data: member } = await supabase
      .from('club_members')
      .select('streak_atual, streak_max, ultima_atualizacao')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .single()

    if (!member) return 0

    const today = new Date().toISOString().slice(0, 10)
    const last = member.ultima_atualizacao

    let newStreak = member.streak_atual || 0
    if (!last) {
      newStreak = 1
    } else if (last === today) {
      // já atualizou hoje, sem incremento
    } else {
      const diff = Math.round(
        (new Date(today) - new Date(last)) / (1000 * 60 * 60 * 24)
      )
      newStreak = diff === 1 ? (member.streak_atual || 0) + 1 : 1
    }

    const newMax = Math.max(newStreak, member.streak_max || 0)

    await supabase
      .from('club_members')
      .update({
        pagina_atual: novaPagina,
        streak_atual: newStreak,
        streak_max: newMax,
        ultima_atualizacao: today,
      })
      .eq('club_id', clubId)
      .eq('user_id', userId)

    return newStreak
  }, [])

  return { updateStreak }
}
