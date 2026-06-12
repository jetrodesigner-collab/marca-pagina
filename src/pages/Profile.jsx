import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

export default function Profile({ session, onNavigate }) {
  const [theme]     = useState(() => localStorage.getItem('tema') || 'D')
  const [profile,   setProfile]  = useState(null)
  const [stats,     setStats]    = useState({ books: 0, movies: 0, reviews: 0 })
  const [editOpen,  setEditOpen] = useState(false)
  const [editData,  setEditData] = useState({ full_name: '', bio: '', link_1: '', link_2: '' })
  const [saving,    setSaving]   = useState(false)
  const [saveErr,   setSaveErr]  = useState(null)

  const themeClass = theme === 'L' ? 'light' : 'dark'

  useEffect(() => {
    supabase
      .from('profiles')
      .select('full_name, username, avatar_url, bio, link_1, link_2')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data)
          setEditData({
            full_name: data.full_name || '',
            bio:       data.bio       || '',
            link_1:    data.link_1    || '',
            link_2:    data.link_2    || '',
          })
        }
      })
  }, [session.user.id])

  useEffect(() => {
    async function loadStats() {
      const { data: userItems } = await supabase
        .from('user_items')
        .select('item_id, items(type)')
        .eq('user_id', session.user.id)

      const books  = (userItems || []).filter(ui => ui.items?.type === 'book').length
      const movies = (userItems || []).filter(ui => ui.items?.type === 'movie').length

      const { count: reviewCount } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)

      setStats({ books, movies, reviews: reviewCount || 0 })
    }
    loadStats()
  }, [session.user.id])

  async function handleSaveProfile() {
    setSaving(true)
    setSaveErr(null)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editData.full_name.trim() || null,
        bio:       editData.bio.trim()       || null,
        link_1:    editData.link_1.trim()    || null,
        link_2:    editData.link_2.trim()    || null,
      })
      .eq('id', session.user.id)
    setSaving(false)
    if (error) {
      setSaveErr(error.message)
    } else {
      setProfile(prev => ({ ...prev, ...editData }))
      setEditOpen(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    // App.jsx detecta session = null e exibe Login
  }

  function formatLink(url) {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0]
  }

  function makeHref(url) {
    return url.startsWith('http') ? url : `https://${url}`
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

        {/* Área de scroll */}
        <div className="sc" style={{ paddingTop: 32 }}>

          {/* Avatar com flutuação */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <div className="prof-av float-av">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : <span style={{ fontSize: 34, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{initial}</span>
              }
            </div>

            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 14, letterSpacing: '-.01em', textAlign: 'center' }}>
              {profile?.full_name || profile?.username || '—'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginTop: 3 }}>
              @{profile?.username}
            </div>

            {profile?.bio && (
              <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', marginTop: 10, lineHeight: 1.6, maxWidth: 280 }}>
                {profile.bio}
              </div>
            )}

            {(profile?.link_1 || profile?.link_2) && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                {profile.link_1 && (
                  <a href={makeHref(profile.link_1)} target="_blank" rel="noopener noreferrer" className="prof-link">
                    🔗 {formatLink(profile.link_1)}
                  </a>
                )}
                {profile.link_2 && (
                  <a href={makeHref(profile.link_2)} target="_blank" rel="noopener noreferrer" className="prof-link">
                    🔗 {formatLink(profile.link_2)}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Estatísticas */}
          <div className="prof-stats">
            <div className="pstat">
              <div className="pstat-n">{stats.books}</div>
              <div className="pstat-l">Livros</div>
            </div>
            <div className="pstat">
              <div className="pstat-n">{stats.movies}</div>
              <div className="pstat-l">Filmes</div>
            </div>
            <div className="pstat">
              <div className="pstat-n">{stats.reviews}</div>
              <div className="pstat-l">Resenhas</div>
            </div>
          </div>

          {/* Menu */}
          <div className="prof-menu">
            <div className="pmitem" onClick={() => setEditOpen(true)}>
              <span className="pmicon">✏️</span>
              <span className="pmlab">Editar perfil</span>
              <span className="pmchev">›</span>
            </div>
            <div className="pmdiv" />
            <div className="pmitem">
              <span className="pmicon">🎨</span>
              <span className="pmlab">Aparência</span>
              <span className="pmchev">›</span>
            </div>
            <div className="pmdiv" />
            <div className="pmitem">
              <span className="pmicon">❓</span>
              <span className="pmlab">Ajuda e suporte</span>
              <span className="pmchev">›</span>
            </div>
          </div>

          <button className="signout-btn" onClick={handleSignOut}>
            Sair da conta
          </button>

        </div>

        {/* Bottom navigation */}
        <div className="bnav">
          <div className="ni" onClick={() => onNavigate('library')}>
            <span className="nic">📚</span>
            <span className="nla">Biblioteca</span>
          </div>
          <div className="ni" onClick={() => onNavigate('community')}>
            <span className="nic">👥</span>
            <span className="nla">Comunidade</span>
          </div>
          <div className="ni" onClick={() => onNavigate('search')}>
            <span className="nic">🔍</span>
            <span className="nla">Buscar</span>
          </div>
          <div className="ni on">
            <span className="nic">👤</span>
            <span className="nla">Perfil</span>
          </div>
        </div>

      </div>

      {/* Modal de edição de perfil */}
      {editOpen && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setEditOpen(false) }}
        >
          <div className={`modal-sheet ${themeClass}`} style={{ background: 'var(--bg)' }}>
            <div className="modal-handle" />
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 20 }}>
              Editar perfil
            </div>

            <span className="flab">Nome completo</span>
            <input
              className="finp"
              type="text"
              placeholder="Seu Nome"
              value={editData.full_name}
              onChange={e => setEditData(d => ({ ...d, full_name: e.target.value }))}
              maxLength={60}
            />

            <span className="flab">Bio</span>
            <textarea
              className="finp"
              placeholder="Conte um pouco sobre você..."
              value={editData.bio}
              onChange={e => setEditData(d => ({ ...d, bio: e.target.value }))}
              style={{ resize: 'none', minHeight: 80, lineHeight: 1.55 }}
              maxLength={160}
            />

            <span className="flab">Link 1</span>
            <input
              className="finp"
              type="text"
              placeholder="@instagram ou instagram.com/voce"
              value={editData.link_1}
              onChange={e => setEditData(d => ({ ...d, link_1: e.target.value }))}
            />

            <span className="flab">Link 2</span>
            <input
              className="finp"
              type="text"
              placeholder="seusite.com"
              value={editData.link_2}
              onChange={e => setEditData(d => ({ ...d, link_2: e.target.value }))}
            />

            {saveErr && <p className="ferr">{saveErr}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button
                className="savebtn"
                style={{ flex: 1, background: 'var(--sur)', color: 'var(--text2)', boxShadow: 'none', border: '1px solid var(--bor2)' }}
                onClick={() => setEditOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="savebtn"
                style={{ flex: 1 }}
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
