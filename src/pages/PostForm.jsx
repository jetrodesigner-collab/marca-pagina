import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

const TITLE_MAX = 50
const CONTENT_MAX = 2000

export default function PostForm({ session, onNavigate, post }) {
  const [theme] = useState(() => localStorage.getItem('tema') || 'D')
  const themeClass = theme === 'L' ? 'light' : 'dark'
  const isEdit = !!post

  const [profile, setProfile] = useState(null)
  const [title, setTitle] = useState(post?.title || '')
  const [content, setContent] = useState(post?.content || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('username, full_name, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [session.user.id])

  async function handleSubmit() {
    if (!content.trim()) {
      setError('Escreva algo para publicar.')
      return
    }
    setError(null)
    setSaving(true)

    if (isEdit) {
      const { error: err } = await supabase
        .from('posts')
        .update({ title: title.trim() || null, content: content.trim(), updated_at: new Date().toISOString() })
        .eq('id', post.id)
      setSaving(false)
      if (err) { setError('Erro ao salvar: ' + err.message); return }
    } else {
      const { error: err } = await supabase
        .from('posts')
        .insert({ user_id: session.user.id, title: title.trim() || null, content: content.trim() })
      setSaving(false)
      if (err) { setError('Erro ao publicar: ' + err.message); return }
    }

    onNavigate('community')
  }

  const initial = (profile?.full_name || profile?.username || session.user.email || '?')[0].toUpperCase()

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
          <div className="bk" onClick={() => onNavigate('community')}>←</div>
          <div className="ph-t">{isEdit ? 'Editar post' : 'Novo post'}</div>
        </div>

        <div className="gl" />

        <div className="sc">
          <div className="post-card-form">
            <div className="post-form-header">
              <div className="post-form-av">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : initial
                }
              </div>
              <div>
                <div>
                  <span className="post-form-name">{profile?.full_name || profile?.username || 'Você'}</span>
                  <span className="post-form-badge">✦ post público</span>
                </div>
                <div className="post-form-sub">
                  {isEdit ? 'Editando — visível para toda a comunidade' : 'Visível para toda a comunidade'}
                </div>
              </div>
            </div>

            <div className="post-field-label">
              <span className="post-field-lbl">Título</span>
              <span className={`post-char-count${title.length > TITLE_MAX * 0.8 ? ' warn' : ''}`}>{title.length} / {TITLE_MAX}</span>
            </div>
            <input
              className="post-title-input"
              placeholder="Uma frase que chame atenção..."
              maxLength={TITLE_MAX}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            <div className="post-field-label">
              <span className="post-field-lbl">Conteúdo</span>
              <span className={`post-char-count${content.length > CONTENT_MAX * 0.8 ? ' warn' : ''}`}>{content.length} / {CONTENT_MAX}</span>
            </div>
            <textarea
              className="post-content-area"
              placeholder="Compartilhe sua reflexão, descoberta ou pensamento sobre livros e filmes..."
              maxLength={CONTENT_MAX}
              value={content}
              onChange={e => setContent(e.target.value)}
            />

            {error && <p className="ferr">{error}</p>}

            <div className="post-divider" />
            <div className="post-form-btns">
              <button className="post-cancel-btn" onClick={() => onNavigate('community')} disabled={saving}>
                Cancelar
              </button>
              <button className="post-publish-btn" onClick={handleSubmit} disabled={saving}>
                {isEdit ? (saving ? 'Salvando...' : '💾 Salvar') : (saving ? 'Publicando...' : '✦ Publicar')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
