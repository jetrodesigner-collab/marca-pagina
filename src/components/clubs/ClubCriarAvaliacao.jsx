import { useState } from 'react'

const inputStyle = {
  display: 'block', width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(196,168,240,.15)',
  borderRadius: 8, padding: '8px 10px', fontFamily: 'Figtree, sans-serif',
  fontSize: 13, color: 'var(--text)', outline: 'none',
}

const labelStyle = {
  fontSize: 11, fontWeight: 600, color: 'var(--muted)',
  display: 'block', marginBottom: 6,
}

function emptyQuestion() {
  return { type: 'dissertativa', question_text: '', options: ['', ''] }
}

export default function ClubCriarAvaliacao({ onBack, onToast, onCreated }) {
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [questions, setQuestions] = useState([emptyQuestion()])
  const [submitting, setSubmitting] = useState(false)

  function addQuestion() {
    setQuestions(q => [...q, emptyQuestion()])
  }

  function removeQuestion(i) {
    if (questions.length === 1) return
    setQuestions(q => q.filter((_, idx) => idx !== i))
  }

  function updateQ(i, field, value) {
    setQuestions(q => q.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item
    ))
  }

  function setType(i, type) {
    setQuestions(q => q.map((item, idx) =>
      idx === i ? { ...item, type, options: type === 'multipla_escolha' ? (item.options.length >= 2 ? item.options : ['', '']) : item.options }
                : item
    ))
  }

  function addOption(qi) {
    setQuestions(q => q.map((item, idx) =>
      idx === qi ? { ...item, options: [...item.options, ''] } : item
    ))
  }

  function updateOption(qi, oi, value) {
    setQuestions(q => q.map((item, idx) =>
      idx === qi ? { ...item, options: item.options.map((o, oidx) => oidx === oi ? value : o) } : item
    ))
  }

  function removeOption(qi, oi) {
    setQuestions(q => q.map((item, idx) =>
      idx === qi ? { ...item, options: item.options.filter((_, oidx) => oidx !== oi) } : item
    ))
  }

  async function handleSubmit() {
    if (!title.trim()) { onToast?.('Título obrigatório.'); return }
    if (!deadline) { onToast?.('Prazo obrigatório.'); return }
    if (!questions.length) { onToast?.('Adicione ao menos uma pergunta.'); return }
    if (questions.some(q => !q.question_text.trim())) {
      onToast?.('Todas as perguntas precisam de texto.'); return
    }
    const badMC = questions.find(q => q.type === 'multipla_escolha' && q.options.filter(o => o.trim()).length < 2)
    if (badMC) { onToast?.('Múltipla escolha precisa de ao menos 2 opções.'); return }

    setSubmitting(true)
    try {
      await onCreated({
        title: title.trim(),
        deadline: new Date(deadline).toISOString(),
        questions: questions.map(q => ({
          type: q.type,
          question_text: q.question_text.trim(),
          options: q.type === 'multipla_escolha' ? q.options.filter(o => o.trim()) : null,
        })),
      })
      onBack()
      onToast?.('✓ Avaliação publicada!')
    } catch {
      onToast?.('Erro ao publicar avaliação.')
    } finally {
      setSubmitting(false)
    }
  }

  // Min datetime: now
  const minDeadline = new Date(Date.now() + 60000).toISOString().slice(0, 16)

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      overflowY: 'auto', scrollbarWidth: 'none',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid var(--bor)',
        background: 'var(--sur)', position: 'sticky', top: 0, zIndex: 1, flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontFamily: 'Figtree, sans-serif', fontSize: 13, fontWeight: 600, padding: 0, minWidth: 60 }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="10 4 6 8 10 12"/></svg>
          Voltar
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Criar Avaliação</div>
        <div style={{ minWidth: 60 }} />
      </div>

      {/* Form */}
      <div style={{ padding: '24px 20px 60px', flex: 1 }}>

        {/* Title */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Título da avaliação</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Avaliação — capítulos 1 a 5"
            style={inputStyle}
          />
        </div>

        {/* Deadline */}
        <div style={{ marginBottom: 28 }}>
          <label style={labelStyle}>Prazo (data e hora limite)</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            min={minDeadline}
            style={{ ...inputStyle, colorScheme: 'dark' }}
          />
        </div>

        {/* Questions */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>
          Perguntas
        </div>

        {questions.map((q, qi) => (
          <div
            key={qi}
            style={{ background: 'rgba(42,38,55,1)', border: '1px solid rgba(196,168,240,.12)', borderRadius: 12, padding: 14, marginBottom: 12 }}
          >
            {/* Question header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>Pergunta {qi + 1}</span>
              {questions.length > 1 && (
                <button
                  onClick={() => removeQuestion(qi)}
                  style={{ fontSize: 11, color: '#F07A7A', background: 'rgba(240,122,122,.1)', border: '1px solid rgba(240,122,122,.2)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontFamily: 'Figtree, sans-serif' }}
                >
                  Remover
                </button>
              )}
            </div>

            {/* Type toggle */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[
                { value: 'dissertativa', label: 'Dissertativa' },
                { value: 'multipla_escolha', label: 'Múltipla escolha' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setType(qi, opt.value)}
                  style={{
                    fontSize: 11, fontWeight: 600, borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontFamily: 'Figtree, sans-serif',
                    color: q.type === opt.value ? '#1A1720' : 'var(--muted)',
                    background: q.type === opt.value ? 'var(--accent)' : 'rgba(255,255,255,.04)',
                    border: q.type === opt.value ? 'none' : '1px solid rgba(196,168,240,.15)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Question text */}
            <textarea
              value={q.question_text}
              onChange={e => updateQ(qi, 'question_text', e.target.value)}
              placeholder="Texto da pergunta..."
              rows={2}
              style={{ ...inputStyle, resize: 'none', fontSize: 12 }}
            />

            {/* Options for multiple choice */}
            {q.type === 'multipla_escolha' && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>Opções de resposta:</div>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)', minWidth: 16, textAlign: 'right' }}>{oi + 1}.</span>
                    <input
                      value={opt}
                      onChange={e => updateOption(qi, oi, e.target.value)}
                      placeholder={`Opção ${oi + 1}`}
                      style={{ ...inputStyle, flex: 1, padding: '6px 8px', fontSize: 12 }}
                    />
                    {q.options.length > 2 && (
                      <button
                        onClick={() => removeOption(qi, oi)}
                        style={{ fontSize: 12, color: '#F07A7A', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addOption(qi)}
                  style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px dashed rgba(196,168,240,.25)', borderRadius: 7, padding: '4px 12px', cursor: 'pointer', fontFamily: 'Figtree, sans-serif', marginTop: 4 }}
                >
                  + Adicionar opção
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add question */}
        <button
          onClick={addQuestion}
          style={{
            width: '100%', padding: '10px', marginTop: 4, marginBottom: 24,
            borderRadius: 10, border: '1.5px dashed rgba(196,168,240,.3)',
            background: 'rgba(196,168,240,.05)', color: 'var(--accent)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'Figtree, sans-serif',
          }}
        >
          + Adicionar pergunta
        </button>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%', padding: '13px', borderRadius: 12,
            background: submitting ? 'rgba(196,168,240,.4)' : 'var(--accent)',
            color: '#1A1720', border: 'none', fontSize: 14, fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'Figtree, sans-serif',
          }}
        >
          {submitting ? 'Publicando...' : 'Publicar avaliação'}
        </button>
      </div>
    </div>
  )
}
