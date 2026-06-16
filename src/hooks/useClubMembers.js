import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useClubMembers(clubId) {
  const [members, setMembers] = useState([])
  const [activeMeta, setActiveMeta] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!clubId) return
    setLoading(true)

    const [{ data: memberRows }, { data: metaRows }, { data: postCounts }, { data: badgeRows }] = await Promise.all([
      supabase
        .from('club_members')
        .select('*, profile:profiles!user_id (id, full_name, username, avatar_url)')
        .eq('club_id', clubId)
        .eq('status', 'ativo'),
      supabase
        .from('club_metas')
        .select('*')
        .eq('club_id', clubId)
        .eq('ativa', true)
        .order('criado_em', { ascending: false })
        .limit(1),
      supabase
        .from('club_posts')
        .select('user_id, tipo')
        .eq('club_id', clubId),
      supabase
        .from('club_badges')
        .select('user_id, tipo, label, icone, ganho_em')
        .eq('club_id', clubId),
    ])

    const postCountMap = {}
    ;(postCounts || []).forEach(p => {
      if (!postCountMap[p.user_id]) postCountMap[p.user_id] = { comentarios: 0, trechos: 0 }
      if (p.tipo === 'comentario' || p.tipo === 'progresso') postCountMap[p.user_id].comentarios++
      if (p.tipo === 'trecho') postCountMap[p.user_id].trechos++
    })

    const badgeMap = {}
    ;(badgeRows || []).forEach(b => {
      if (!badgeMap[b.user_id]) badgeMap[b.user_id] = []
      badgeMap[b.user_id].push(b)
    })

    const meta = (metaRows || [])[0] || null
    setActiveMeta(meta)

    const merged = (memberRows || []).map(m => ({
      ...m,
      postCount: (postCountMap[m.user_id]?.comentarios || 0),
      trechoCount: (postCountMap[m.user_id]?.trechos || 0),
      badges: badgeMap[m.user_id] || [],
      pct: meta?.pagina_fim
        ? Math.min(100, Math.round(((m.pagina_atual || 0) / meta.pagina_fim) * 100))
        : 0,
    }))

    merged.sort((a, b) => (b.pagina_atual || 0) - (a.pagina_atual || 0))
    setMembers(merged)
    setLoading(false)
  }, [clubId])

  useEffect(() => { load() }, [load])

  return { members, activeMeta, loading, refresh: load }
}
