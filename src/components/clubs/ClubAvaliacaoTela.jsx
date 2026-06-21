import { useState, useEffect } from 'react'

const STATUS_LABEL = { aberta: 'Aberta', encerrada: 'Encerrada', corrigida: 'Corrigida' }
const STATUS_STYLE = {
  aberta:    { color: '#7EE8A2', bg: 'rgba(126,232,162,.1)',  border: 'rgba(126,232,162,.25)' },
  encerrada: { color: '#F0C97A', bg: 'rgba(240,201,122,.1)',  border: 'rgba(240,201,122,.25)' },
  corrigida: { color: '#C4A8F0', bg: 'rgba(196,168,240,.1)',  border: 'rgba(196,168,240,.25)' },
}

const MEMBER_COLORS = [
  { bg: 'rgba(196,168,240,.14)', color: '#C4A8F0' },
  { bg: 'rgba(126,223,168,.13)', color: '#7EDFA8' },
  { bg: 'rgba(240,201,122,.13)', color: '#F0C97A' },
]

function colorFor(id) {
  let h = 0
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) % MEMBER_COLORS.length
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length]
}

function avatarInitial(profile) {
  return ((profile?.full_name || profile?.username || '?').charAt(0)).toUpperCase()
}

function Avatar({ profile, userId, size = 30 }) {
  const c = colorFor(userId)
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, background: c.bg, color: c.color }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        : avatarInitial(profile)}
    </div>
  )
}

function computeStatus(activity) {
  if (!activity) return 'aberta'
  if (activity.status === 'corrigida') return 'corrigida'
  return (!activity.deadline || new Date() < new Date(activity.deadline)) ? 'aberta' : 'encerrada'
}

const inputStyle = {
  display: 'block', width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(196,168,240,.15)',
  borderRadius: 8, padding: '8px 10px', fontFamily: 'Figtree, sans-serif',
  fontSize: 13, color: 'var(--text)', outline: 'none',
}

// ── Tab: Responder ─────────────────────────────────────────────────────────────

function TabResponder({ activity, myAnswers, currentUserId, isAdmin, isDeadlinePassed, onToast, onSubmitAnswers, onDeleteMyAnswers }) {
  const questions = activity.questions || []
  const hasSubmitted = myAnswers.length > 0
  const [editMode, setEditMode] = useState(!hasSubmitted)

  const initForm = () => questions.map(q => {
    const existing = myAnswers.find(a => a.question_id === q.id)
    return { questionId: q.id, answerText: existing?.answer_text || '' }
  })

  const [formAnswers, setFormAnswers] = useState(initForm)
  // Single privacy toggle for the whole activity submission
  const [isPublic, setIsPublic] = useState(() => myAnswers[0]?.is_public || false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setFormAnswers(initForm())
    setIsPublic(myAnswers[0]?.is_public || false)
    setEditMode(!hasSubmitted)
  }, [myAnswers.length, activity.id])

  function updateAnswerText(qi, value) {
    setFormAnswers(prev => prev.map((a, i) => i === qi ? { ...a, answerText: value } : a))
  }

  async function handleSubmit() {
    const incomplete = formAnswers.some(a => !a.answerText.trim())
    if (incomplete) { onToast?.('Responda todas as perguntas.'); return }
    setSubmitting(true)
    try {
      // Apply the single isPublic value to every answer row
      await onSubmitAnswers(formAnswers.map(a => ({ ...a, isPublic })))
      setEditMode(false)
      onToast?.('✓ Resposta enviada!')
    } catch {
      onToast?.('Erro ao enviar resposta.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDeleteMyAnswers()
      setIsPublic(false)
      setEditMode(true)
      onToast?.('Respostas removidas.')
    } catch {
      onToast?.('Erro ao remover.')
    } finally {
      setDeleting(false)
    }
  }

  const canEdit = !isDeadlinePassed || isAdmin
  const submittedIsPublic = myAnswers[0]?.is_public || false

  if (hasSubmitted && !editMode) {
    return (
      <div>
        {/* Single privacy badge for the whole submission */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: '#7EE8A2' }}>✓</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Você já respondeu esta avaliação.</span>
          <span style={{
            fontSize: 10, fontWeight: 600, borderRadius: 6, padding: '2px 8px',
            color: submittedIsPublic ? '#7EE8A2' : '#C4A8F0',
            background: submittedIsPublic ? 'rgba(126,232,162,.1)' : 'rgba(196,168,240,.1)',
            border: `1px solid ${submittedIsPublic ? 'rgba(126,232,162,.25)' : 'rgba(196,168,240,.2)'}`,
          }}>
            {submittedIsPublic ? '🌐 Pública' : '🔒 Privada'}
          </span>
        </div>
        {questions.map((q, qi) => {
          const ans = myAnswers.find(a => a.question_id === q.id)
          return (
            <div key={q.id} style={{ marginBottom: 12, background: 'rgba(42,38,55,1)', border: '1px solid var(--bor)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Pergunta {qi + 1}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8, lineHeight: 1.4 }}>{q.question_text}</div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{ans?.answer_text || '—'}</div>
            </div>
          )
        })}
        {canEdit && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => setEditMode(true)}
              style={{ flex: 1, padding: '9px', borderRadius: 10, border: '1px solid rgba(196,168,240,.25)', background: 'rgba(196,168,240,.08)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Figtree, sans-serif' }}
            >
              Editar respostas
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(240,122,122,.2)', background: 'rgba(240,122,122,.06)', color: '#F07A7A', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Figtree, sans-serif' }}
            >
              {deleting ? '...' : 'Remover'}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (isDeadlinePassed && !isAdmin) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏰</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>O prazo desta avaliação encerrou.</div>
      </div>
    )
  }

  return (
    <div>
      {editMode && hasSubmitted && (
        <div style={{ fontSize: 11, color: '#F0C97A', background: 'rgba(240,201,122,.08)', border: '1px solid rgba(240,201,122,.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
          ✏️ Editando suas respostas anteriores.
        </div>
      )}

      {questions.map((q, qi) => {
        const fa = formAnswers[qi]
        return (
          <div key={q.id} style={{ marginBottom: 18 }}>
            <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>Pergunta {qi + 1}</span>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, marginTop: 2, marginBottom: 8 }}>{q.question_text}</div>

            {q.type === 'dissertativa' ? (
              <textarea
                value={fa?.answerText || ''}
                onChange={e => updateAnswerText(qi, e.target.value)}
                placeholder="Sua resposta..."
                rows={3}
                style={{ ...inputStyle, resize: 'none', fontSize: 13 }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(q.options || []).map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => updateAnswerText(qi, opt)}
                    style={{
                      textAlign: 'left', padding: '9px 12px', borderRadius: 9, cursor: 'pointer',
                      fontFamily: 'Figtree, sans-serif', fontSize: 13,
                      border: fa?.answerText === opt ? '1.5px solid var(--accent)' : '1px solid rgba(196,168,240,.15)',
                      background: fa?.answerText === opt ? 'rgba(196,168,240,.12)' : 'rgba(255,255,255,.03)',
                      color: fa?.answerText === opt ? 'var(--accent)' : 'var(--text)',
                      fontWeight: fa?.answerText === opt ? 600 : 400,
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Single privacy toggle for the whole activity */}
      <div style={{ marginBottom: 16, marginTop: 4, padding: '14px', background: 'rgba(42,38,55,1)', border: '1px solid rgba(196,168,240,.12)', borderRadius: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>
          Minha resposta nesta avaliação será:
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { value: false, label: '🔒 Privada', desc: 'só o professor vê' },
            { value: true,  label: '🌐 Pública', desc: 'todo o clube vê' },
          ].map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => setIsPublic(opt.value)}
              style={{
                flex: 1, padding: '10px 8px', cursor: 'pointer',
                fontFamily: 'Figtree, sans-serif', borderRadius: 10,
                color: isPublic === opt.value ? (opt.value ? '#7EE8A2' : '#C4A8F0') : 'var(--muted)',
                background: isPublic === opt.value ? (opt.value ? 'rgba(126,232,162,.1)' : 'rgba(196,168,240,.1)') : 'rgba(255,255,255,.03)',
                border: `1.5px solid ${isPublic === opt.value ? (opt.value ? 'rgba(126,232,162,.3)' : 'rgba(196,168,240,.25)') : 'rgba(196,168,240,.12)'}`,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700 }}>{opt.label}</div>
              <div style={{ fontSize: 10, opacity: 0.65, marginTop: 2 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {editMode && hasSubmitted && (
          <button
            onClick={() => setEditMode(false)}
            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(196,168,240,.2)', background: 'none', color: 'var(--muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Figtree, sans-serif' }}
          >
            Cancelar
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            flex: 1, padding: '12px', borderRadius: 12,
            background: submitting ? 'rgba(196,168,240,.4)' : 'var(--accent)',
            color: '#1A1720', border: 'none', fontSize: 13, fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'Figtree, sans-serif',
          }}
        >
          {submitting ? 'Enviando...' : hasSubmitted ? 'Salvar edição' : 'Enviar resposta'}
        </button>
      </div>
    </div>
  )
}

// ── Tab: Respostas do grupo ────────────────────────────────────────────────────

function TabRespostas({ activity, answers, grades, members, currentUserId, isAdmin }) {
  const questions = activity.questions || []

  const memberList = members.map(m => ({
    ...m,
    userAnswers: answers.filter(a => a.user_id === m.user_id),
    hasAnswered: answers.some(a => a.user_id === m.user_id),
    grade: grades.find(g => g.user_id === m.user_id) || null,
  }))

  const responded = memberList.filter(m => m.hasAnswered)
  const pending   = memberList.filter(m => !m.hasAnswered)

  // Single is_public per user — all their answers share the same value
  function getUserIsPublic(userAnswers) {
    return userAnswers[0]?.is_public || false
  }

  function canSeeAnswers(memberId, userAnswers) {
    return getUserIsPublic(userAnswers) || memberId === currentUserId || isAdmin
  }

  function canSeeGrade(memberId, userAnswers) {
    return memberId === currentUserId || isAdmin || getUserIsPublic(userAnswers)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, fontSize: 11, color: 'var(--muted)' }}>
        <span style={{ color: '#7EE8A2', fontWeight: 700 }}>{responded.length} responderam</span>
        <span>·</span>
        <span>{pending.length} pendentes</span>
      </div>

      {responded.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Nenhuma resposta ainda.</div>
        </div>
      )}

      {responded.map(m => {
        const isOwn = m.user_id === currentUserId
        const userIsPublic = getUserIsPublic(m.userAnswers)
        const showContent = canSeeAnswers(m.user_id, m.userAnswers)
        const showGrade = canSeeGrade(m.user_id, m.userAnswers)

        return (
          <div key={m.user_id} style={{ marginBottom: 14, background: 'rgba(42,38,55,1)', border: '1px solid var(--bor)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Member header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: showContent ? '1px solid var(--bor)' : 'none' }}>
              <Avatar profile={m.profile} userId={m.user_id} size={28} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {isOwn ? 'Você' : (m.profile?.full_name || m.profile?.username || 'Membro')}
                </span>
                {m.grade && showGrade && (
                  <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#CCA33D', background: 'rgba(204,163,61,.15)', borderRadius: 6, padding: '1px 6px' }}>
                    Nota: {m.grade.nota !== null && m.grade.nota !== undefined ? m.grade.nota : '—'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, borderRadius: 6, padding: '2px 6px',
                  color: userIsPublic ? '#7EE8A2' : '#C4A8F0',
                  background: userIsPublic ? 'rgba(126,232,162,.1)' : 'rgba(196,168,240,.1)',
                  border: `1px solid ${userIsPublic ? 'rgba(126,232,162,.25)' : 'rgba(196,168,240,.2)'}`,
                }}>
                  {userIsPublic ? '🌐' : '🔒'}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#7EE8A2', background: 'rgba(126,232,162,.1)', borderRadius: 6, padding: '2px 7px' }}>
                  ✓
                </span>
              </div>
            </div>

            {/* Answers — all visible or none */}
            {showContent ? (
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {questions.map((q, qi) => {
                  const ans = m.userAnswers.find(a => a.question_id === q.id)
                  return (
                    <div key={q.id}>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>P{qi + 1}. {q.question_text}</div>
                      <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{ans?.answer_text || '—'}</div>
                    </div>
                  )
                })}
                {m.grade?.feedback && showGrade && (
                  <div style={{ borderTop: '1px solid var(--bor)', paddingTop: 8, marginTop: 4 }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Feedback do admin:</div>
                    <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, fontStyle: 'italic' }}>{m.grade.feedback}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'rgba(90,84,104,1)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  🔒 Resposta privada — conteúdo visível apenas para o admin
                </div>
              </div>
            )}
          </div>
        )
      })}

      {pending.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>Pendentes</div>
          {pending.map(m => (
            <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 8, background: 'rgba(42,38,55,.6)', border: '1px solid var(--bor)', borderRadius: 12 }}>
              <Avatar profile={m.profile} userId={m.user_id} size={26} />
              <span style={{ flex: 1, fontSize: 12, color: 'var(--muted)' }}>
                {m.user_id === currentUserId ? 'Você' : (m.profile?.full_name || m.profile?.username || 'Membro')}
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)', background: 'rgba(255,255,255,.04)', borderRadius: 6, padding: '2px 7px', border: '1px solid var(--bor)' }}>
                Pendente
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab: Corrigir ──────────────────────────────────────────────────────────────

function TabCorrigir({ activity, answers, grades, members, currentUserId, onToast, onSaveGrade, onUpdateStatus }) {
  const questions = activity.questions || []

  const respondentIds = [...new Set(answers.map(a => a.user_id))]
  const respondents = respondentIds.map(uid => {
    const userAnswers = answers.filter(a => a.user_id === uid)
    const profile = userAnswers[0]?.profile || members.find(m => m.user_id === uid)?.profile
    const grade = grades.find(g => g.user_id === uid)
    return { userId: uid, profile, answers: userAnswers, grade }
  })

  const [gradeStates, setGradeStates] = useState(() => {
    const s = {}
    respondents.forEach(r => {
      s[r.userId] = { nota: r.grade?.nota ?? '', feedback: r.grade?.feedback ?? '' }
    })
    return s
  })
  const [saving, setSaving] = useState({})

  async function handleSave(userId) {
    const gs = gradeStates[userId]
    setSaving(s => ({ ...s, [userId]: true }))
    try {
      await onSaveGrade(userId, gs.nota, gs.feedback)
      onToast?.('✓ Nota salva!')
    } catch {
      onToast?.('Erro ao salvar nota.')
    } finally {
      setSaving(s => ({ ...s, [userId]: false }))
    }
  }

  async function handleMarkCorrigida() {
    try {
      await onUpdateStatus('corrigida')
      onToast?.('✓ Avaliação marcada como Corrigida.')
    } catch {
      onToast?.('Erro ao atualizar status.')
    }
  }

  if (respondents.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Nenhum membro respondeu ainda.</div>
      </div>
    )
  }

  return (
    <div>
      {activity.status !== 'corrigida' && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={handleMarkCorrigida}
            style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid rgba(196,168,240,.25)', background: 'rgba(196,168,240,.08)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Figtree, sans-serif' }}
          >
            ✓ Marcar avaliação como Corrigida
          </button>
        </div>
      )}

      {respondents.map(r => {
        const gs = gradeStates[r.userId] || { nota: '', feedback: '' }
        const userIsPublic = r.answers[0]?.is_public || false
        return (
          <div key={r.userId} style={{ marginBottom: 18, background: 'rgba(42,38,55,1)', border: '1px solid var(--bor)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--bor)' }}>
              <Avatar profile={r.profile} userId={r.userId} size={28} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {r.userId === currentUserId ? 'Você' : (r.profile?.full_name || r.profile?.username || 'Membro')}
              </span>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, borderRadius: 6, padding: '2px 6px',
                  color: userIsPublic ? '#7EE8A2' : '#C4A8F0',
                  background: userIsPublic ? 'rgba(126,232,162,.1)' : 'rgba(196,168,240,.1)',
                  border: `1px solid ${userIsPublic ? 'rgba(126,232,162,.25)' : 'rgba(196,168,240,.2)'}`,
                }}>
                  {userIsPublic ? '🌐 Pública' : '🔒 Privada'}
                </span>
                {r.grade && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#CCA33D', background: 'rgba(204,163,61,.15)', borderRadius: 6, padding: '2px 6px' }}>
                    {r.grade.nota !== null && r.grade.nota !== undefined ? `Nota ${r.grade.nota}` : 'Sem nota'}
                  </span>
                )}
              </div>
            </div>

            {/* Answers */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bor)' }}>
              {questions.map((q, qi) => {
                const ans = r.answers.find(a => a.question_id === q.id)
                return (
                  <div key={q.id} style={{ marginBottom: qi < questions.length - 1 ? 12 : 0 }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>P{qi + 1}. {q.question_text}</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                      {ans?.answer_text || <span style={{ color: 'var(--muted)' }}>Sem resposta</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Grade form */}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 'none' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>Nota</div>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="0–10"
                    value={gs.nota}
                    onChange={e => setGradeStates(s => ({ ...s, [r.userId]: { ...gs, nota: e.target.value } }))}
                    style={{
                      width: 72, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(196,168,240,.15)',
                      borderRadius: 8, padding: '6px 8px', fontFamily: 'Figtree, sans-serif',
                      fontSize: 13, color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>Feedback (opcional)</div>
                  <input
                    placeholder="Comentário..."
                    value={gs.feedback}
                    onChange={e => setGradeStates(s => ({ ...s, [r.userId]: { ...gs, feedback: e.target.value } }))}
                    style={{
                      width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,.04)',
                      border: '1px solid rgba(196,168,240,.15)', borderRadius: 8, padding: '6px 8px',
                      fontFamily: 'Figtree, sans-serif', fontSize: 12, color: 'var(--text)', outline: 'none',
                    }}
                  />
                </div>
              </div>
              <button
                onClick={() => handleSave(r.userId)}
                disabled={saving[r.userId]}
                style={{
                  alignSelf: 'flex-end', padding: '7px 16px', borderRadius: 9,
                  background: saving[r.userId] ? 'rgba(196,168,240,.3)' : 'var(--accent)',
                  color: '#1A1720', border: 'none', fontSize: 12, fontWeight: 700,
                  cursor: saving[r.userId] ? 'not-allowed' : 'pointer', fontFamily: 'Figtree, sans-serif',
                }}
              >
                {saving[r.userId] ? 'Salvando...' : 'Salvar nota'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ClubAvaliacaoTela({
  activity, answers, grades, myAnswers, myGrade,
  members, currentUserId, isAdmin,
  onBack, onToast, onSubmitAnswers, onDeleteMyAnswers, onSaveGrade, onUpdateStatus, onDeleteActivity,
}) {
  const status = computeStatus(activity)
  const isDeadlinePassed = activity?.deadline && new Date() > new Date(activity.deadline)

  const TABS = isAdmin
    ? ['Responder', 'Respostas', 'Corrigir']
    : ['Responder', 'Respostas']

  const [activeTab, setActiveTab] = useState(0)
  const [deletingActivity, setDeletingActivity] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  async function handleDeleteActivity() {
    setDeletingActivity(true)
    try {
      await onDeleteActivity()
      onBack()
      onToast?.('Avaliação excluída.')
    } catch {
      onToast?.('Erro ao excluir avaliação.')
      setDeletingActivity(false)
    }
  }

  if (!activity) return null

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'var(--bg)', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid var(--bor)',
        background: 'var(--sur)', flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontFamily: 'Figtree, sans-serif', fontSize: 13, fontWeight: 600, padding: 0, minWidth: 60 }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="10 4 6 8 10 12"/></svg>
          Voltar
        </button>
        <div style={{ flex: 1, textAlign: 'center', padding: '0 8px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activity.title}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, minWidth: 60, justifyContent: 'flex-end', alignItems: 'center' }}>
          <span style={{
            fontSize: 10, fontWeight: 600, borderRadius: 6, padding: '2px 8px',
            color: STATUS_STYLE[status].color,
            background: STATUS_STYLE[status].bg,
            border: `1px solid ${STATUS_STYLE[status].border}`,
          }}>
            {STATUS_LABEL[status]}
          </span>
          {isAdmin && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ fontSize: 11, color: '#F07A7A', background: 'rgba(240,122,122,.08)', border: '1px solid rgba(240,122,122,.2)', borderRadius: 6, padding: '3px 7px', cursor: 'pointer', fontFamily: 'Figtree, sans-serif' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Deadline info */}
      {activity.deadline && (
        <div style={{ padding: '8px 20px', background: 'rgba(42,38,55,.7)', borderBottom: '1px solid var(--bor)', fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          ⏰ Prazo: {new Date(activity.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--bor)', background: 'var(--sur)', flexShrink: 0 }}>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Figtree, sans-serif', fontSize: 12, fontWeight: 600,
              color: activeTab === i ? 'var(--accent)' : 'var(--muted)',
              borderBottom: activeTab === i ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'color .15s, border-color .15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '20px 20px 48px' }}>
        {activeTab === 0 && (
          <TabResponder
            activity={activity}
            myAnswers={myAnswers}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            isDeadlinePassed={isDeadlinePassed}
            onToast={onToast}
            onSubmitAnswers={onSubmitAnswers}
            onDeleteMyAnswers={onDeleteMyAnswers}
          />
        )}
        {activeTab === 1 && (
          <TabRespostas
            activity={activity}
            answers={answers}
            grades={grades}
            members={members}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        )}
        {activeTab === 2 && isAdmin && (
          <TabCorrigir
            activity={activity}
            answers={answers}
            grades={grades}
            members={members}
            currentUserId={currentUserId}
            onToast={onToast}
            onSaveGrade={onSaveGrade}
            onUpdateStatus={onUpdateStatus}
          />
        )}
      </div>

      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          background: 'rgba(26,23,32,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{ background: 'var(--sur)', border: '1px solid var(--bor)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 320 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Excluir avaliação?</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 20 }}>
              Todas as perguntas, respostas e notas serão permanentemente excluídas.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(196,168,240,.2)', background: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Figtree, sans-serif' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteActivity}
                disabled={deletingActivity}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#F07A7A', color: '#1A1720', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Figtree, sans-serif', opacity: deletingActivity ? 0.6 : 1 }}
              >
                {deletingActivity ? '...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
