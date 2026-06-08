import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

const COVER_COLORS = ['c1','c2','c3','c4','c5','c6','c7','c8','c9']

function BookCover({ coverId, title }) {
  const [imgError, setImgError] = useState(false)

  if (coverId && !imgError) {
    return (
      <img
        className="srcov"
        src={`https://covers.openlibrary.org/b/id/${coverId}-M.jpg`}
        alt=""
        onError={() => setImgError(true)}
      />
    )
  }

  const initials = title
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  const colorClass = COVER_COLORS[title.charCodeAt(0) % COVER_COLORS.length]

  return (
    <div
      className={`srcov ${colorClass}`}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 13 }}>
        {initials}
      </span>
    </div>
  )
}

function PlusButton() {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(196,184,232,.2)',
      border: '1px solid rgba(196,184,232,.35)',
      color: 'var(--accent)', fontSize: 18,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
    }}>
      +
    </div>
  )
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="srr" style={{ pointerEvents: 'none' }}>
          <div className="srcov" style={{ background: 'var(--sur2)' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
            <div style={{ height: 13, borderRadius: 6, background: 'var(--sur2)', width: '68%' }} />
            <div style={{ height: 10, borderRadius: 6, background: 'var(--sur2)', width: '48%' }} />
            <div style={{ height: 9, borderRadius: 6, background: 'var(--sur2)', width: '28%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Search({ session, onNavigate }) {
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('L')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [theme] = useState(() => localStorage.getItem('tema') || 'D')
  const debounceRef = useRef(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [session.user.id])

  const themeClass = theme === 'L' ? 'light' : 'dark'
  const initial = (
    profile?.full_name || profile?.username || session.user.email || '?'
  )[0].toUpperCase()

  function handleInput(e) {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    if (!val.trim()) {
      setResults([])
      setSearched(false)
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      setSearched(true)
      try {
        const res = await fetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(val.trim())}&limit=10`
        )
        const data = await res.json()
        setResults(data.docs || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 500)
  }

  return (
    <div
      className={themeClass}
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {BLOBS.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'fixed', borderRadius: '50%',
            filter: 'blur(55px)', pointerEvents: 'none', zIndex: 0,
            ...b,
          }}
        />
      ))}

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        height: '100vh', overflow: 'hidden',
      }}>

        {/* Topbar */}
        <div className="topbar">
          <div className="logo">marca<em>·página</em></div>
          <div
            className="av"
            style={profile?.avatar_url ? { padding: 0, overflow: 'hidden' } : {}}
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initial
            }
          </div>
        </div>

        {/* Divisor */}
        <div className="gl" />

        {/* Abas */}
        <div className="mtabs">
          <div
            className={`mt${activeTab === 'L' ? ' on' : ''}`}
            onClick={() => setActiveTab('L')}
          >
            📚 Livros
          </div>
          <div
            className={`mt${activeTab === 'F' ? ' on' : ''}`}
            onClick={() => setActiveTab('F')}
          >
            🎬 Filmes
          </div>
        </div>

        {/* Área de scroll */}
        <div className="sc">

          {/* ── Aba Livros ── */}
          {activeTab === 'L' && (
            <>
              <div className="srch">
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>🔍</span>
                <input
                  placeholder="Buscar por título ou autor..."
                  value={query}
                  onChange={handleInput}
                  autoFocus
                />
              </div>

              {loading && <SkeletonList />}

              {!loading && !searched && (
                <div style={{ textAlign: 'center', padding: '52px 0 24px', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 14 }}>🔍</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>
                    Busque por título ou autor
                  </div>
                  <div style={{ fontSize: 11, lineHeight: 1.65 }}>
                    Resultados em tempo real da Open Library
                  </div>
                </div>
              )}

              {!loading && searched && results.length === 0 && (
                <div style={{ textAlign: 'center', padding: '52px 0 24px', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>😶</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>
                    Nenhum resultado
                  </div>
                  <div style={{ fontSize: 11, lineHeight: 1.65 }}>
                    Tente outro título ou autor
                  </div>
                </div>
              )}

              {!loading && results.length > 0 && (
                <>
                  <div className="slb">Resultados · Open Library</div>

                  {results.map((book, i) => (
                    <div key={book.key || i} className="srr">
                      <BookCover coverId={book.cover_i} title={book.title} />
                      <div className="srm">
                        <div className="srt">{book.title}</div>
                        <div className="sra">
                          {book.author_name?.join(', ') || 'Autor desconhecido'}
                        </div>
                        {book.first_publish_year && (
                          <div className="sry">{book.first_publish_year}</div>
                        )}
                      </div>
                      <PlusButton />
                    </div>
                  ))}

                  <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
                      Não encontrou? Adicione manualmente
                    </div>
                    <button style={{
                      padding: '10px 24px', borderRadius: 12,
                      border: '1.5px dashed var(--add-bor)',
                      background: 'var(--add-bg)', color: 'var(--accent)',
                      fontFamily: "'Figtree', sans-serif",
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>
                      📷 Adicionar com foto
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Aba Filmes ── */}
          {activeTab === 'F' && (
            <div style={{ textAlign: 'center', padding: '60px 0 24px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>🎬</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>
                Em breve
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.65 }}>
                Busca por filmes será integrada na próxima fase
              </div>
            </div>
          )}

        </div>

        {/* Bottom navigation */}
        <div className="bnav">
          <div className="ni" onClick={() => onNavigate('library')}>
            <span className="nic">📚</span>
            <span className="nla">Biblioteca</span>
          </div>
          <div className="ni">
            <span className="nic">👥</span>
            <span className="nla">Comunidade</span>
          </div>
          <div className="ni on">
            <span className="nic">🔍</span>
            <span className="nla">Buscar</span>
          </div>
          <div className="ni">
            <span className="nic">👤</span>
            <span className="nla">Perfil</span>
          </div>
        </div>

      </div>
    </div>
  )
}
