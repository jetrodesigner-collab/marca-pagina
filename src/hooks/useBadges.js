import { supabase } from '../lib/supabase'

export async function checkBadges(userId, clubId, context = {}) {
  const newBadges = []

  const { data: existing } = await supabase
    .from('club_badges')
    .select('tipo')
    .eq('user_id', userId)
    .eq('club_id', clubId)

  const has = new Set((existing || []).map(b => b.tipo))

  async function grant(tipo, label, icone) {
    if (has.has(tipo)) return
    const { error } = await supabase
      .from('club_badges')
      .insert({ club_id: clubId, user_id: userId, tipo, label, icone })
    if (!error) {
      has.add(tipo)
      newBadges.push({ tipo, label, icone })
    }
  }

  // Fundador
  const { data: club } = await supabase
    .from('clubs')
    .select('criador_id')
    .eq('id', clubId)
    .single()
  if (club?.criador_id === userId) {
    await grant('fundador', 'Fundador', '📖')
  }

  // Dados do membro
  const { data: member } = await supabase
    .from('club_members')
    .select('streak_atual, pagina_atual')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .single()

  // Chama Viva: streak >= 7
  if ((member?.streak_atual || 0) >= 7) {
    await grant('chama_viva', 'Chama Viva', '🔥')
  }

  // Comentarista: >= 10 comentários
  const { count: cmtCount } = await supabase
    .from('club_posts')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .in('tipo', ['comentario', 'progresso'])
  if ((cmtCount || 0) >= 10) {
    await grant('comentarista', 'Comentarista', '💬')
  }

  // Madrugador: postou entre 00h e 05h
  if (context.postHour !== undefined && context.postHour >= 0 && context.postHour < 5) {
    await grant('madrugador', 'Madrugador', '🌙')
  }

  // Leitor Relâmpago: concluiu meta com +24h de antecedência
  if (context.meta && member) {
    const { pagina_fim, data_limite } = context.meta
    if ((member.pagina_atual || 0) >= pagina_fim && data_limite) {
      const hoursLeft = (new Date(data_limite) - new Date()) / (1000 * 60 * 60)
      if (hoursLeft > 24) {
        await grant('leitor_relampago', 'Leitor Relâmpago', '⚡')
      }
    }
  }

  // Pioneiro: primeiro membro a concluir a meta no clube
  if (context.meta && member) {
    const { pagina_fim } = context.meta
    if ((member.pagina_atual || 0) >= pagina_fim) {
      const { data: otherPioneers } = await supabase
        .from('club_badges')
        .select('user_id')
        .eq('club_id', clubId)
        .eq('tipo', 'pioneiro')
        .neq('user_id', userId)
      if (!otherPioneers || otherPioneers.length === 0) {
        await grant('pioneiro', 'Pioneiro', '🏆')
      }
    }
  }

  return newBadges
}
