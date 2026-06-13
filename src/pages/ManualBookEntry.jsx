import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { moderateImage } from '../utils/moderateImage'

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

const CATEGORIES = [
  'Literatura Brasileira', 'Literatura Internacional', 'Ficção Científica', 'Fantasia',
  'Romance', 'Filosofia', 'História', 'Autoajuda', 'Negócios', 'Psicologia',
  'Religião e Espiritualidade', 'Policial e Suspense', 'Biografia', 'Outros',
]

const STATUSES = [
  { value: 'reading',      label: '📖 Lendo' },
  { value: 'read',         label: '✅ Lido' },
  { value: 'want_to_read', label: '🔖 Quero Ler' },
]

export default function ManualBookEntry({ session, onNavigate }) {
  const [theme] = useState(() => localStorage.getItem('tema') || 'D')
  const themeClass = theme === 'L' ? 'light' : 'dark'

  const [title,    setTitle]    = useState('')
  const [author,   setAuthor]   = useState('')
  const [year,     setYear]     = useState('')
  const [category, setCategory] = useState('')
  const [status,   setStatus]   = useState('want_to_read')
  const [coverFile,    setCoverFile]    = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
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
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!title.trim() || !author.trim() || !category) {
      setError('Preencha os campos obrigatórios.')
      return
    }
    setError(null)
    setSaving(true)

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) throw new Error('Sessão inválida. Faça login novamente.')

      let cover_url = null
      if (coverFile) {
        const ext = coverFile.name.split('.').pop()
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage.from('covers').upload(path, coverFile)
        if (upErr) throw new Error('Erro ao enviar a capa: ' + upErr.message)
        const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
        cover_url = publicUrl
      }

      const { data: item, error: itemErr } = await supabase
        .from('items')
        .insert({
          type:       'book',
          api_id:     `manual_${crypto.randomUUID()}`,
          title:      title.trim(),
          author:     author.trim(),
          year:       year ? parseInt(year) : null,
          category,
          cover_url,
          api_source: 'manual',
          is_manual:  true,
          created_by: user.id,
        })
        .select()
        .single()

      if (itemErr) throw new Error('Erro ao salvar o livro: ' + itemErr.message)

      const { data: userItem, error: uiErr } = await supabase
        .from('user_items')
        .insert({ user_id: user.id, item_id: item.id, status })
        .select()
        .single()

      if (uiErr) throw new Error('Erro ao adicionar à biblioteca: ' + uiErr.message)

      setToast('Livro adicionado com sucesso!')
      setTimeout(() => onNavigate('item', { item, userItem, isOwner: true }), 900)
    } catch (err) {
      console.error('ManualBookEntry handleSubmit:', err)
      setError(err.message || 'Erro ao salvar o livro.')
    } finally {
      setSaving(false)
    }
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
          <div className="ph-t">Adicionar Livro</div>
        </div>

        <div className="gl" />

        <div className="sc">
          <div className="type-badge tb-l">📷 Cadastro manual</div>

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

          <div className="sec-t">Informações do livro</div>

          <span className="flab">Título *</span>
          <input className="finp" placeholder="Ex: Crime e Castigo" value={title} onChange={e => setTitle(e.target.value)} />

          <span className="flab">Autor *</span>
          <input className="finp" placeholder="Ex: Fiódor Dostoiévski" value={author} onChange={e => setAuthor(e.target.value)} />

          <span className="flab">Ano de publicação</span>
          <input className="finp" type="number" placeholder="Ex: 1866" value={year} onChange={e => setYear(e.target.value)} />

          <span className="flab">Categoria *</span>
          <div className="sel-w">
            <select className="finp" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="" disabled>Selecione</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="sec-t">Status de leitura</div>
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
    </div>
  )
}
