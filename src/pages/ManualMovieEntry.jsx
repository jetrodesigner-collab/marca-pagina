import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { moderateImage } from '../utils/moderateImage'
import CoverCropModal from '../components/movies/CoverCropModal'

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

const CATEGORIES = [
  'Drama', 'Comédia', 'Ficção Científica', 'Ação e Aventura', 'Terror',
  'Suspense e Thriller', 'Romance', 'Animação', 'Documentário',
  'Histórico e Biográfico', 'Crime', 'Outros',
]

const STATUSES = [
  { value: 'watched',       label: '✅ Assistido' },
  { value: 'want_to_watch', label: '🔖 Quero Ver' },
]

export default function ManualMovieEntry({ session, onNavigate }) {
  const [theme] = useState(() => localStorage.getItem('tema') || 'D')
  const themeClass = theme === 'L' ? 'light' : 'dark'

  const [title,    setTitle]    = useState('')
  const [director, setDirector] = useState('')
  const [year,     setYear]     = useState('')
  const [duration, setDuration] = useState('')
  const [category, setCategory] = useState('')
  const [status,   setStatus]   = useState('want_to_watch')
  const [coverFile,    setCoverFile]    = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [cropFile,     setCropFile]     = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)
  const [toast,   setToast]   = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  async function handleCoverChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const result = await moderateImage(file)
    if (!result.approved) {
      setToast(result.reason || 'Imagem não permitida')
      return
    }
    setCropFile(file)
  }

  function handleCropConfirm(webpFile) {
    setCoverFile(webpFile)
    setCoverPreview(URL.createObjectURL(webpFile))
    setCropFile(null)
  }

  async function handleSubmit() {
    if (!title.trim() || !category) {
      setError('Preencha os campos obrigatórios.')
      return
    }
    setError(null)
    setSaving(true)

    let cover_url = null
    if (coverFile) {
      const ext = coverFile.name.split('.').pop()
      const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('covers').upload(path, coverFile)
      if (upErr) {
        setSaving(false)
        setError('Erro ao enviar a capa: ' + upErr.message)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
      cover_url = publicUrl
    }

    const { data: item, error: itemErr } = await supabase
      .from('items')
      .insert({
        type:             'movie',
        api_id:           `manual_${crypto.randomUUID()}`,
        title:            title.trim(),
        director:         director.trim() || null,
        year:             year ? parseInt(year) : null,
        duration_minutes: duration ? parseInt(duration) : null,
        category,
        cover_url,
        api_source: 'manual',
        is_manual:  true,
        created_by: session.user.id,
        status:     'pending',
      })
      .select()
      .single()

    if (itemErr) {
      setSaving(false)
      setError('Erro ao salvar o filme: ' + itemErr.message)
      return
    }

    const { data: userItem, error: uiErr } = await supabase
      .from('user_items')
      .insert({ user_id: session.user.id, item_id: item.id, status })
      .select()
      .single()

    setSaving(false)
    if (uiErr) {
      setError('Erro ao adicionar à biblioteca: ' + uiErr.message)
      return
    }

    setToast('Filme enviado para aprovação! Ele já aparece na sua coleção.')
    setTimeout(() => onNavigate('item', { item, userItem, isOwner: true }), 900)
  }

  return (
    <div
      className={themeClass}
      style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
    >
      {BLOBS.map((b, i) => (
        <div key={i} style={{ position: 'fixed', borderRadius: '50%', filter: 'blur(55px)', pointerEvents: 'none', zIndex: 0, ...b }} />
      ))}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <div className="ph">
          <div className="bk" onClick={() => onNavigate('library')}>←</div>
          <div className="ph-t">Adicionar Filme</div>
        </div>

        <div className="gl" />

        <div className="sc">
          <div className="type-badge tb-f">📷 Cadastro manual</div>

          <div className="photo-up" onClick={() => fileRef.current?.click()}>
            {coverPreview
              ? <img src={coverPreview} alt="" />
              : (
                <>
                  <div className="pico">📷</div>
                  <div className="plab">Adicionar capa</div>
                  <div className="psub">Tire uma foto ou escolha da galeria</div>
                </>
              )
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverChange} />

          <div className="sec-t">Informações do filme</div>

          <span className="flab">Título *</span>
          <input className="finp" placeholder="Ex: Oppenheimer" value={title} onChange={e => setTitle(e.target.value)} />

          <span className="flab">Diretor</span>
          <input className="finp" placeholder="Ex: Christopher Nolan" value={director} onChange={e => setDirector(e.target.value)} />

          <span className="flab">Ano de lançamento</span>
          <input className="finp" type="number" placeholder="Ex: 2023" value={year} onChange={e => setYear(e.target.value)} />

          <span className="flab">Duração (minutos)</span>
          <input className="finp" type="number" placeholder="Ex: 180" value={duration} onChange={e => setDuration(e.target.value)} />

          <span className="flab">Categoria *</span>
          <div className="sel-w">
            <select className="finp" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="" disabled>Selecione</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="sec-t">Status</div>
          <div className="sts-row">
            {STATUSES.map(s => (
              <button
                key={s.value}
                className={`sts-btn${status === s.value ? ' on' : ''}`}
                onClick={() => setStatus(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {error && <p className="ferr">{error}</p>}

          <button className="savebtn" style={{ marginTop: 16 }} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando…' : 'Adicionar à Biblioteca'}
          </button>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      {cropFile && (
        <CoverCropModal
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  )
}
