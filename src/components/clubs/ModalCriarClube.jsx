import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const MAX_OPTIONS = [5, 10, 15, 20]

async function toWebP400(file) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const SIZE = 400
      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      const ratio = Math.max(SIZE / img.width, SIZE / img.height)
      const w = img.width * ratio
      const h = img.height * ratio
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h)
      canvas.toBlob(blob => {
        resolve(new File([blob], 'foto.webp', { type: 'image/webp' }))
      }, 'image/webp', 0.82)
    }
    img.src = URL.createObjectURL(file)
  })
}

export default function ModalCriarClube({ userId, onClose, onCreate }) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [privacidade, setPrivacidade] = useState('privado')
  const [maxMembros, setMaxMembros] = useState(20)
  const [isCustom, setIsCustom] = useState(false)
  const [customMembros, setCustomMembros] = useState('')
  const [livroTexto, setLivroTexto] = useState('')
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef(null)

  async function handleFotoChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const webp = await toWebP400(file)
    setFotoFile(webp)
    setFotoPreview(URL.createObjectURL(webp))
  }

  async function handleCreate() {
    if (!nome.trim()) { setErr('Dê um nome ao clube.'); return }
    const membros = isCustom ? (parseInt(customMembros) || 20) : maxMembros
    setSaving(true)
    setErr('')
    try {
      let foto_url = null
      if (fotoFile) {
        const path = `clubs/${userId}/${crypto.randomUUID()}.webp`
        const { error: upErr } = await supabase.storage.from('covers').upload(path, fotoFile)
        if (upErr) throw new Error('Erro ao enviar foto: ' + upErr.message)
        const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
        foto_url = publicUrl
      }

      const club = await onCreate({
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        livro: livroTexto.trim() ? { titulo: livroTexto.trim(), autor: null, capa: null, id: null } : null,
        privacidade,
        max_membros: membros,
        foto_url,
      })
      onClose(club)
    } catch (e) {
      setErr(e.message || 'Erro ao criar clube.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose(null)}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'var(--text)' }}>Criar clube</div>

        {/* Foto do clube */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 80,
              height: 80,
              borderRadius: 16,
              border: `2px dashed ${fotoPreview ? 'transparent' : 'rgba(196,168,240,.35)'}`,
              background: fotoPreview ? 'transparent' : 'rgba(196,168,240,.06)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {fotoPreview
              ? <img src={fotoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(196,168,240,.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>Foto do clube</span>
                </>
            }
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{ marginTop: 6, fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Figtree, sans-serif', fontWeight: 600 }}
          >
            {fotoPreview ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoChange} />
        </div>

        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
          Nome do clube *
        </label>
        <input
          className="finp"
          placeholder="Ex: Os Leitores de Elite"
          value={nome}
          onChange={e => setNome(e.target.value)}
          style={{ marginBottom: 14 }}
        />

        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
          Descrição (opcional)
        </label>
        <textarea
          className="finp"
          placeholder="Sobre o clube..."
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          rows={2}
          style={{ resize: 'none', marginBottom: 14 }}
        />

        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
          Livro da leitura
        </label>
        <input
          className="finp"
          placeholder="Nome do livro (opcional)"
          value={livroTexto}
          onChange={e => setLivroTexto(e.target.value)}
          style={{ marginBottom: 14 }}
        />

        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Privacidade
        </label>
        <div className="priv" style={{ marginBottom: 14 }}>
          <button className={`pb${privacidade === 'publico' ? ' on' : ''}`} onClick={() => setPrivacidade('publico')}>
            🌍 Público
          </button>
          <button className={`pb${privacidade === 'privado' ? ' on' : ''}`} onClick={() => setPrivacidade('privado')}>
            🔒 Privado
          </button>
        </div>

        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Limite de membros
        </label>
        <div style={{ display: 'flex', gap: 6, marginBottom: isCustom ? 8 : 20 }}>
          {MAX_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => { setMaxMembros(n); setIsCustom(false) }}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 12,
                border: `1px solid ${!isCustom && maxMembros === n ? 'rgba(196,168,240,.45)' : 'var(--bor2)'}`,
                background: !isCustom && maxMembros === n ? 'rgba(196,184,232,.15)' : 'var(--sur)',
                color: !isCustom && maxMembros === n ? 'var(--accent)' : 'var(--muted)',
                fontFamily: 'Figtree, sans-serif',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setIsCustom(true)}
            style={{
              flex: 1.4,
              padding: '10px 4px',
              borderRadius: 12,
              border: `1px solid ${isCustom ? 'rgba(196,168,240,.45)' : 'var(--bor2)'}`,
              background: isCustom ? 'rgba(196,184,232,.15)' : 'var(--sur)',
              color: isCustom ? 'var(--accent)' : 'var(--muted)',
              fontFamily: 'Figtree, sans-serif',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            Personalizado
          </button>
        </div>
        {isCustom && (
          <input
            className="finp"
            type="number"
            placeholder="Quantidade personalizada (ex: 30, 50, 100)"
            value={customMembros}
            onChange={e => setCustomMembros(e.target.value)}
            min={2}
            max={500}
            style={{ marginBottom: 20 }}
          />
        )}

        {err && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="post-cancel-btn" onClick={() => onClose(null)} disabled={saving}>
            Cancelar
          </button>
          <button className="post-publish-btn" onClick={handleCreate} disabled={saving}>
            {saving ? 'Criando...' : 'Criar clube'}
          </button>
        </div>
      </div>
    </div>
  )
}
