import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useClubActivity(clubId, currentUserId) {
  const [activity, setActivity] = useState(null)
  const [answers, setAnswers] = useState([])
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clubId) return
    load()
  }, [clubId])

  async function load() {
    setLoading(true)
    try {
      // Latest activity for this club
      const { data: acts } = await supabase
        .from('club_activities')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!acts?.length) {
        setActivity(null)
        setAnswers([])
        setGrades([])
        return
      }

      const act = acts[0]

      // Questions, answers, grades in parallel
      const [{ data: questions }, { data: answerData }, { data: gradeData }] = await Promise.all([
        supabase
          .from('club_activity_questions')
          .select('*')
          .eq('activity_id', act.id)
          .order('order_index'),
        supabase
          .from('club_activity_answers')
          .select('*')
          .eq('activity_id', act.id),
        supabase
          .from('club_activity_grades')
          .select('*')
          .eq('activity_id', act.id),
      ])

      // Profiles for all respondents
      const userIds = [...new Set((answerData || []).map(a => a.user_id))]
      let profileMap = {}
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', userIds)
        profiles?.forEach(p => { profileMap[p.id] = p })
      }

      setActivity({ ...act, questions: questions || [] })
      setAnswers((answerData || []).map(a => ({ ...a, profile: profileMap[a.user_id] || null })))
      setGrades(gradeData || [])
    } catch (err) {
      console.error('[useClubActivity]', err)
    } finally {
      setLoading(false)
    }
  }

  async function createActivity({ title, deadline, questions }) {
    const { data: act, error } = await supabase
      .from('club_activities')
      .insert({ club_id: clubId, created_by: currentUserId, title, deadline, status: 'aberta' })
      .select()
      .single()
    if (error) {
      console.error('[useClubActivity] createActivity insert error:', error)
      throw error
    }
    if (!act) {
      const err = new Error('Avaliação não pôde ser criada — verifique permissões do clube.')
      console.error('[useClubActivity] createActivity: insert retornou null', err)
      throw err
    }

    if (questions?.length) {
      const { error: qErr } = await supabase
        .from('club_activity_questions')
        .insert(questions.map((q, i) => ({
          activity_id: act.id,
          type: q.type,
          question_text: q.question_text,
          options: q.options?.length ? q.options : null,
          order_index: i,
        })))
      if (qErr) {
        console.error('[useClubActivity] createActivity questions insert error:', qErr)
        throw qErr
      }
    }

    await load()
  }

  async function submitAnswers(answersList) {
    if (!activity?.id) return
    const rows = answersList.map(a => ({
      activity_id: activity.id,
      question_id: a.questionId,
      user_id: currentUserId,
      answer_text: a.answerText,
      is_public: a.isPublic,
      updated_at: new Date().toISOString(),
    }))
    const { error } = await supabase
      .from('club_activity_answers')
      .upsert(rows, { onConflict: 'question_id,user_id' })
    if (error) throw error
    await load()
  }

  async function deleteMyAnswers() {
    if (!activity?.id) return
    await supabase
      .from('club_activity_answers')
      .delete()
      .eq('activity_id', activity.id)
      .eq('user_id', currentUserId)
    await load()
  }

  async function saveGrade(userId, nota, feedback) {
    if (!activity?.id) return
    const { error } = await supabase
      .from('club_activity_grades')
      .upsert({
        activity_id: activity.id,
        user_id: userId,
        nota: nota !== '' && nota !== null ? parseFloat(nota) : null,
        feedback: feedback?.trim() || null,
        graded_by: currentUserId,
        graded_at: new Date().toISOString(),
      }, { onConflict: 'activity_id,user_id' })
    if (error) throw error
    await load()
  }

  async function deleteActivity() {
    if (!activity?.id) return
    await supabase.from('club_activities').delete().eq('id', activity.id)
    setActivity(null)
    setAnswers([])
    setGrades([])
  }

  async function updateStatus(status) {
    if (!activity?.id) return
    await supabase.from('club_activities').update({ status }).eq('id', activity.id)
    await load()
  }

  const myAnswers = answers.filter(a => a.user_id === currentUserId)
  const myGrade = grades.find(g => g.user_id === currentUserId) || null

  return {
    activity, answers, grades, myAnswers, myGrade, loading,
    createActivity, submitAnswers, deleteMyAnswers, saveGrade, deleteActivity, updateStatus,
    refresh: load,
  }
}
