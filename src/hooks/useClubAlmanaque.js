import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useClubAlmanaque(clubId, currentUserId) {
  const [content, setContent] = useState(null)
  const [notes, setNotes] = useState([])
  const [cardLikes, setCardLikes] = useState([])
  const [cardComments, setCardComments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (clubId) refresh() }, [clubId])

  async function refresh() {
    setLoading(true)
    const [
      { data: contentData },
      { data: notesData },
      { data: clData },
      { data: ccData },
    ] = await Promise.all([
      supabase.from('club_almanaque_content').select('*').eq('club_id', clubId).maybeSingle(),
      supabase.from('club_almanaque_notes').select('*').eq('club_id', clubId).order('created_at', { ascending: false }),
      supabase.from('club_almanaque_card_likes').select('*').eq('club_id', clubId),
      supabase.from('club_almanaque_card_comments').select('*').eq('club_id', clubId).order('created_at'),
    ])

    setContent(contentData || null)
    setCardLikes(clData || [])

    const ccWithProfiles = await attachProfiles(ccData || [])
    setCardComments(ccWithProfiles)

    if (notesData?.length) {
      const noteIds = notesData.map(n => n.id)
      const [{ data: nlData }, { data: ncData }] = await Promise.all([
        supabase.from('club_almanaque_note_likes').select('*').in('note_id', noteIds),
        supabase.from('club_almanaque_note_comments').select('*').in('note_id', noteIds).order('created_at'),
      ])

      const allUserIds = [...new Set([
        ...notesData.map(n => n.user_id),
        ...(ncData || []).map(c => c.user_id),
      ])]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', allUserIds)
      const pMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]))

      const ncMapped = (ncData || []).map(c => ({ ...c, profile: pMap[c.user_id] }))
      setNotes(notesData.map(n => ({
        ...n,
        profile: pMap[n.user_id],
        likes: (nlData || []).filter(l => l.note_id === n.id),
        comments: ncMapped.filter(c => c.note_id === n.id),
      })))
    } else {
      setNotes([])
    }

    setLoading(false)
  }

  async function attachProfiles(items) {
    if (!items.length) return items
    const ids = [...new Set(items.map(i => i.user_id))]
    const { data } = await supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', ids)
    const pMap = Object.fromEntries((data || []).map(p => [p.id, p]))
    return items.map(i => ({ ...i, profile: pMap[i.user_id] }))
  }

  async function saveContent(contextoHistorico, curiosidades) {
    const { error } = await supabase
      .from('club_almanaque_content')
      .upsert(
        {
          club_id: clubId,
          contexto_historico: contextoHistorico !== undefined ? (contextoHistorico || null) : null,
          curiosidades: curiosidades !== undefined ? (curiosidades || null) : null,
          updated_by: currentUserId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'club_id' }
      )
    if (error) {
      const msg = error.message || error.details || error.hint || JSON.stringify(error)
      console.error('[useClubAlmanaque] saveContent upsert error:', msg, error)
      throw new Error(`DB ${error.code || 'erro'}: ${msg}`)
    }
    const { data, error: selErr } = await supabase
      .from('club_almanaque_content')
      .select('*')
      .eq('club_id', clubId)
      .maybeSingle()
    if (selErr) {
      const msg = selErr.message || selErr.details || JSON.stringify(selErr)
      console.error('[useClubAlmanaque] saveContent select error:', msg)
    }
    setContent(data || null)
    if (!data) {
      throw new Error('Permissão negada — execute clubs-v12-almanaque-fix.sql no Supabase.')
    }
  }

  async function addNote(text) {
    const { data, error } = await supabase
      .from('club_almanaque_notes')
      .insert({ club_id: clubId, user_id: currentUserId, content: text })
      .select()
      .single()
    if (error) throw error
    const { data: profile } = await supabase.from('profiles').select('id, full_name, username, avatar_url').eq('id', currentUserId).maybeSingle()
    setNotes(prev => [{ ...data, profile, likes: [], comments: [] }, ...prev])
  }

  async function deleteNote(noteId) {
    const { error } = await supabase.from('club_almanaque_notes').delete().eq('id', noteId)
    if (error) throw error
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }

  async function toggleNoteLike(noteId) {
    const note = notes.find(n => n.id === noteId)
    const existing = note?.likes.find(l => l.user_id === currentUserId)
    if (existing) {
      await supabase.from('club_almanaque_note_likes').delete().eq('id', existing.id)
      setNotes(prev => prev.map(n =>
        n.id === noteId ? { ...n, likes: n.likes.filter(l => l.user_id !== currentUserId) } : n
      ))
    } else {
      const { data } = await supabase
        .from('club_almanaque_note_likes')
        .insert({ note_id: noteId, user_id: currentUserId })
        .select()
        .single()
      setNotes(prev => prev.map(n =>
        n.id === noteId ? { ...n, likes: [...n.likes, data] } : n
      ))
    }
  }

  async function addNoteComment(noteId, text) {
    const { data, error } = await supabase
      .from('club_almanaque_note_comments')
      .insert({ note_id: noteId, user_id: currentUserId, content: text })
      .select()
      .single()
    if (error) throw error
    const { data: profile } = await supabase.from('profiles').select('id, full_name, username, avatar_url').eq('id', currentUserId).maybeSingle()
    setNotes(prev => prev.map(n =>
      n.id === noteId ? { ...n, comments: [...n.comments, { ...data, profile }] } : n
    ))
  }

  async function deleteNoteComment(noteId, commentId) {
    await supabase.from('club_almanaque_note_comments').delete().eq('id', commentId)
    setNotes(prev => prev.map(n =>
      n.id === noteId ? { ...n, comments: n.comments.filter(c => c.id !== commentId) } : n
    ))
  }

  async function toggleCardLike(cardType) {
    const existing = cardLikes.find(l => l.card_type === cardType && l.user_id === currentUserId)
    if (existing) {
      await supabase.from('club_almanaque_card_likes').delete().eq('id', existing.id)
      setCardLikes(prev => prev.filter(l => !(l.card_type === cardType && l.user_id === currentUserId)))
    } else {
      const { data } = await supabase
        .from('club_almanaque_card_likes')
        .insert({ club_id: clubId, card_type: cardType, user_id: currentUserId })
        .select()
        .single()
      setCardLikes(prev => [...prev, data])
    }
  }

  async function addCardComment(cardType, text) {
    const { data, error } = await supabase
      .from('club_almanaque_card_comments')
      .insert({ club_id: clubId, card_type: cardType, user_id: currentUserId, content: text })
      .select()
      .single()
    if (error) throw error
    const { data: profile } = await supabase.from('profiles').select('id, full_name, username, avatar_url').eq('id', currentUserId).maybeSingle()
    setCardComments(prev => [...prev, { ...data, profile }])
  }

  async function deleteCardComment(commentId) {
    await supabase.from('club_almanaque_card_comments').delete().eq('id', commentId)
    setCardComments(prev => prev.filter(c => c.id !== commentId))
  }

  return {
    content, notes, cardLikes, cardComments, loading,
    saveContent, addNote, deleteNote,
    toggleNoteLike, addNoteComment, deleteNoteComment,
    toggleCardLike, addCardComment, deleteCardComment,
    refresh,
  }
}
