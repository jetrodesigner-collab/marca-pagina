import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import AuthShell from '../components/AuthShell'

export default function CompleteProfile({ session, onDone }) {
  const meta = session.user.user_metadata ?? {}
  const [username, setUsername] = useState(
    (meta.username ?? meta.preferred_username ?? '').toLowerCase().replace(/[^a-z0-9_.]/g, '')
  )
  const [fullName, setFullName] = useState(meta.full_name ?? meta.name ?? '')
  const [bio, setBio] = useState('')
  const [link1, setLink1] = useState('')
  const [link2, setLink2] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(meta.avatar_url ?? meta.picture ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  function sanitizeUsername(val) {
    return val.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9_.]/g, '').slice(0, 30)
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username) { setError('O username é obrigatório.'); return }
    setError(null)
    setLoading(true)

    let avatar_url = null

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${session.user.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })
      if (upErr) {
        setLoading(false)
        setError('Erro ao enviar avatar: ' + upErr.message)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      avatar_url = publicUrl
    }

    const { error: dbErr } = await supabase.from('profiles').upsert({
      id: session.user.id,
      username,
      full_name: fullName.trim() || null,
      bio: bio.trim() || null,
      link_1: link1.trim() || null,
      link_2: link2.trim() || null,
      avatar_url,
    })

    setLoading(false)
    if (dbErr) {
      setError(dbErr.code === '23505' ? 'Esse @username já existe. Escolha outro.' : dbErr.message)
      return
    }
    onDone()
  }

  const initial = (fullName || username || session.user.email || '?')[0].toUpperCase()

  return (
    <AuthShell subtitle="crie seu perfil">
      <div className="lcard" style={{ marginBottom: 24 }}>
        <form onSubmit={handleSubmit}>

          {/* Avatar upload */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
            <div className="pav-up" onClick={() => fileRef.current?.click()}>
              {avatarPreview
                ? <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : <span style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{initial}</span>
              }
              <div className="pav-up-ov">📷</div>
            </div>
            <button type="button" className="flink"
              style={{ marginTop: 6, marginBottom: 0, textAlign: 'center', display: 'block', width: 'auto' }}
              onClick={() => fileRef.current?.click()}>
              {avatarPreview ? 'Trocar foto' : 'Adicionar foto'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          </div>

          {/* Username */}
          <span className="flab">Username <span style={{ color: 'var(--red)' }}>*</span></span>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: 12, color: 'var(--accent)', fontSize: 13, fontWeight: 700, pointerEvents: 'none' }}>@</span>
            <input className="finp" type="text" placeholder="seu_usuario"
              value={username} onChange={e => setUsername(sanitizeUsername(e.target.value))}
              style={{ paddingLeft: 26 }} required />
          </div>

          <span className="flab">Nome completo</span>
          <input className="finp" type="text" placeholder="Seu Nome"
            value={fullName} onChange={e => setFullName(e.target.value)} maxLength={60} />

          <span className="flab">Bio</span>
          <textarea className="finp" placeholder="Conte um pouco sobre você..."
            value={bio} onChange={e => setBio(e.target.value)}
            style={{ resize: 'none', minHeight: 72, lineHeight: 1.55 }} maxLength={160} />

          <span className="flab">Link 1</span>
          <input className="finp" type="text" placeholder="@instagram ou instagram.com/voce"
            value={link1} onChange={e => setLink1(e.target.value)} />

          <span className="flab">Link 2</span>
          <input className="finp" type="text" placeholder="seusite.com"
            value={link2} onChange={e => setLink2(e.target.value)} />

          {error && <p className="ferr">{error}</p>}

          <button className="savebtn" type="submit" disabled={loading}>
            {loading ? 'Salvando…' : 'Criar perfil →'}
          </button>
        </form>
      </div>
    </AuthShell>
  )
}
