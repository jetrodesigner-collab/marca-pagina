import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useClubs(userId) {
  const [myClubs, setMyClubs] = useState([])
  const [publicClubs, setPublicClubs] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const [{ data: memberRows }, { data: pubRows }] = await Promise.all([
      supabase
        .from('club_members')
        .select(`
          club_id, role, pagina_atual, streak_atual, status,
          clubs (
            id, nome, descricao, livro_titulo, livro_autor, livro_capa,
            livro_id, privacidade, codigo_convite, convite_ativo, max_membros, criado_em, criador_id, foto_url
          )
        `)
        .eq('user_id', userId),
      supabase
        .from('clubs')
        .select('id, nome, descricao, livro_titulo, livro_autor, livro_capa, privacidade, max_membros, criado_em')
        .eq('privacidade', 'publico')
        .order('criado_em', { ascending: false })
        .limit(20),
    ])

    const allMemberships = memberRows || []
    const active = allMemberships.filter(m => m.status === 'ativo' && m.clubs)
    const pending = allMemberships.filter(m => m.status === 'pendente' && m.clubs)

    const clubIds = active.map(m => m.club_id)
    let memberCounts = {}
    if (clubIds.length > 0) {
      const { data: counts } = await supabase
        .from('club_members')
        .select('club_id')
        .in('club_id', clubIds)
        .eq('status', 'ativo')
      ;(counts || []).forEach(r => {
        memberCounts[r.club_id] = (memberCounts[r.club_id] || 0) + 1
      })
    }

    const myIds = new Set(active.map(m => m.club_id))
    setMyClubs(
      active
        .map(m => ({
          ...m.clubs,
          role: m.role,
          pagina_atual: m.pagina_atual,
          streak_atual: m.streak_atual,
          member_count: memberCounts[m.club_id] || 1,
        }))
        .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
    )
    setPublicClubs((pubRows || []).filter(c => !myIds.has(c.id)))
    setInvites(pending.map(m => ({ ...m.clubs, role: m.role })))
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  async function createClub({ nome, descricao, livro, privacidade, max_membros, foto_url, meta }) {
    const { data: club, error } = await supabase
      .from('clubs')
      .insert({
        nome,
        descricao: descricao || null,
        livro_titulo: livro?.titulo || null,
        livro_autor: livro?.autor || null,
        livro_capa: livro?.capa || null,
        livro_id: livro?.id || null,
        criador_id: userId,
        privacidade,
        max_membros,
        foto_url: foto_url || null,
      })
      .select()
      .single()
    if (error) throw error

    await supabase.from('club_members').insert({
      club_id: club.id,
      user_id: userId,
      role: 'admin',
      status: 'ativo',
    })

    if (meta && (meta.capFim || meta.paginaFim)) {
      const parts = []
      if (meta.capInicio && meta.capFim) parts.push(`Caps. ${meta.capInicio}–${meta.capFim}`)
      else if (meta.capFim) parts.push(`até cap. ${meta.capFim}`)
      if (meta.paginaFim) parts.push(`até pág. ${meta.paginaFim}`)
      const titulo = parts.join(' · ') || 'Meta inicial'
      const data_limite = meta.prazoDias
        ? new Date(Date.now() + meta.prazoDias * 86400000).toISOString().slice(0, 10)
        : null
      await supabase.from('club_metas').insert({
        club_id: club.id,
        titulo,
        cap_inicio: meta.capInicio || null,
        cap_fim: meta.capFim || null,
        pagina_fim: meta.paginaFim || null,
        data_limite,
        ativa: true,
      })
    }

    await load()
    return club
  }

  async function joinClub(clubId) {
    const { error } = await supabase.from('club_members').insert({
      club_id: clubId,
      user_id: userId,
      role: 'membro',
      status: 'ativo',
    })
    if (error) throw error
    await load()
  }

  async function acceptInvite(clubId) {
    await supabase
      .from('club_members')
      .update({ status: 'ativo' })
      .eq('club_id', clubId)
      .eq('user_id', userId)
    await load()
  }

  async function declineInvite(clubId) {
    await supabase
      .from('club_members')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', userId)
    await load()
  }

  async function joinByCode(code) {
    const { data: club, error } = await supabase
      .from('clubs')
      .select('id, privacidade, max_membros, convite_ativo')
      .eq('codigo_convite', code)
      .single()
    if (error || !club) throw new Error('Código de convite inválido.')
    if (!club.convite_ativo) throw new Error('Este convite foi desativado.')

    const status = club.privacidade === 'publico' ? 'ativo' : 'pendente'
    const { error: insertError } = await supabase.from('club_members').insert({
      club_id: club.id,
      user_id: userId,
      role: 'membro',
      status,
    })
    if (insertError) throw new Error('Você já é membro deste clube.')
    await load()
    return club
  }

  return {
    myClubs,
    publicClubs,
    invites,
    loading,
    refresh: load,
    createClub,
    joinClub,
    acceptInvite,
    declineInvite,
    joinByCode,
  }
}
