import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TMDB_KEY  = import.meta.env.VITE_TMDB_API_KEY
const PAGE_SIZE = 9

const FRASES = [
  { t: 'Os livros são espelhos: só vemos neles o que já temos dentro de nós.', a: 'Carlos Ruiz Zafón' },
  { t: 'Um leitor vive mil vidas antes de morrer. Aquele que nunca lê vive apenas uma.', a: 'George R.R. Martin' },
  { t: 'Não existe amigo tão leal quanto um livro.', a: 'Ernest Hemingway' },
  { t: 'Ler é sonhar pela mão de outrem.', a: 'Fernando Pessoa' },
  { t: 'Os livros são a prova de que a humanidade é capaz de fazer magia.', a: 'Carl Sagan' },
  { t: 'O cinema pode preencher nos seres humanos o vazio deixado pela vida.', a: 'François Truffaut' },
  { t: 'A imaginação é mais importante que o conhecimento.', a: 'Albert Einstein' },
  { t: 'O cinema é a arte de mostrar nada acontecendo de maneiras interessantes.', a: 'Orson Welles' },
  { t: 'Sublinha o que te move. É aí que você mora.', a: 'Clarice Lispector' },
  { t: 'Toda grande história começa com alguém que não desistiu.', a: 'Fiódor Dostoiévski' },
]

const CATS_LIVROS = ['Todos', 'Ficção Científica', 'Lit. Brasileira', 'Lit. Internacional', 'Filosofia', 'Fantasia', 'Romance', 'História', 'Biografia', 'Psicologia', 'Negócios', 'Autoajuda', 'Policial', 'Outros']
const CATS_FILMES = ['Todos', 'Drama', 'Comédia', 'Ficção Científica', 'Ação', 'Terror', 'Suspense', 'Romance', 'Animação', 'Documentário', 'Histórico', 'Crime', 'Outros']

const COVER_COLORS = ['c1','c2','c3','c4','c5','c6','c7','c8','c9']
const FILM_COLORS  = ['f1','f2','f3','f4','f5','f6']

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

function getDailyFrase() {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 0)
  return FRASES[Math.floor((d - start) / 86400000) % FRASES.length]
}

function ItemCard({ item, onClick }) {
  const [imgErr, setImgErr] = useState(false)
  const initials = item.title.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const colors = item.type === 'movie' ? FILM_COLORS : COVER_COLORS
  const cls = colors[item.title.charCodeAt(0) % colors.length]

  return (
    <div className="bc" onClick={onClick}>
      {item.cover_url && !imgErr ? (
        <img className="cov" src={item.cover_url} alt="" style={{ objectFit: 'cover' }} onError={() => setImgErr(true)} />
      ) : (
        <div className={`cov ${cls}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 13 }}>{initials}</span>
        </div>
      )}
      <div className="btit">{item.title}</div>
      {(item.author || item.director) && <div className="baut">{item.author || item.director}</div>}
    </div>
  )
}

function GridCard({ item, onClick }) {
  const [imgErr, setImgErr] = useState(false)
  const initials = item.title.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const colors = item.type === 'movie' ? FILM_COLORS : COVER_COLORS
  const cls = colors[item.title.charCodeAt(0) % colors.length]

  return (
    <div className="gc" onClick={onClick}>
      {item.cover_url && !imgErr ? (
        <img className="gcov" src={item.cover_url} alt="" style={{ objectFit: 'cover' }} onError={() => setImgErr(true)} />
      ) : (
        <div className={`gcov ${cls}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 13 }}>{initials}</span>
        </div>
      )}
      <div className="gtit">{item.title}</div>
      {(item.author || item.director) && <div className="gaut">{item.author || item.director}</div>}
    </div>
  )
}

function StatusSection({ label, badgeClass, dotClass, userItems, onItemClick, onAddClick }) {
  return (
    <div className="ss">
      <div className="sh">
        <div className={`sb ${badgeClass}`}>
          <div className={`dot ${dotClass}`} />
          {label}
        </div>
        {userItems.length > 0 && <span className="sc-n">{userItems.length}</span>}
      </div>
      <div className="brow">
        {userItems.map(ui => (
          <ItemCard key={ui.id} item={ui.items} onClick={() => onItemClick(ui.items, ui)} />
        ))}
        <div className="addc" onClick={onAddClick}>
          ＋
          <span>Adicionar</span>
        </div>
      </div>
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="grid-sw">
      <div className="grid-h">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <div key={i} className="gc" style={{ opacity: 0.35, pointerEvents: 'none' }}>
            <div className="gcov" style={{ background: 'var(--bor)' }} />
            <div style={{ height: 10, borderRadius: 4, background: 'var(--bor)', margin: '2px 0' }} />
            <div style={{ height: 8, borderRadius: 4, background: 'var(--bor)', width: '60%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function LibrarySection({ tipo, userLibrary, onItemClick }) {
  const [items, setItems]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [tmdbPage, setTmdbPage]       = useState(1)
  const [hasMoreApi, setHasMoreApi]   = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [activeCat, setActiveCat]     = useState('Todos')
  const [query, setQuery]             = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const cats = tipo === 'L' ? CATS_LIVROS : CATS_FILMES
  const noun = tipo === 'L' ? 'livro' : 'filme'

  useEffect(() => {
    setItems([])
    setLoading(true)
    setTmdbPage(1)
    setHasMoreApi(tipo === 'F')
    setVisibleCount(PAGE_SIZE)
    setQuery('')

    if (tipo === 'L') {
      fetch('https://openlibrary.org/trending/weekly.json?limit=27')
        .then(r => r.json())
        .then(data => {
          setItems((data.works || []).map(w => ({
            type: 'book',
            api_id: w.key,
            api_source: 'openlibrary',
            title: w.title,
            author: Array.isArray(w.author_name) ? w.author_name[0] : 'Autor desconhecido',
            year: w.first_publish_year || null,
            cover_url: w.cover_i ? `https://covers.openlibrary.org/b/id/${w.cover_i}-M.jpg` : null,
          })))
          setHasMoreApi(false)
        })
        .catch(() => setItems([]))
        .finally(() => setLoading(false))
    } else {
      fetch(`https://api.themoviedb.org/3/movie/popular?language=pt-BR&page=1&api_key=${TMDB_KEY}`)
        .then(r => r.json())
        .then(data => {
          setItems(mapMovies(data.results || []))
          setHasMoreApi((data.total_pages || 1) > 1)
        })
        .catch(() => { setItems([]); setHasMoreApi(false) })
        .finally(() => setLoading(false))
    }
  }, [tipo])

  function mapMovies(results) {
    return results.map(m => ({
      type: 'movie',
      api_id: String(m.id),
      api_source: 'tmdb',
      title: m.title,
      director: null,
      year: m.release_date ? Number(m.release_date.split('-')[0]) : null,
      cover_url: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null,
    }))
  }

  async function fetchNextMoviePage() {
    if (loadingMore || !hasMoreApi) return
    setLoadingMore(true)
    const next = tmdbPage + 1
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/popular?language=pt-BR&page=${next}&api_key=${TMDB_KEY}`
      )
      const data = await res.json()
      setItems(prev => [...prev, ...mapMovies(data.results || [])])
      setTmdbPage(next)
      setHasMoreApi(next < (data.total_pages || 1))
    } catch {
      // silently ignore
    } finally {
      setLoadingMore(false)
    }
  }

  function handleQueryChange(val) {
    setQuery(val)
    setVisibleCount(PAGE_SIZE)
  }

  function handleVerMais() {
    const next = visibleCount + PAGE_SIZE
    setVisibleCount(next)
    if (tipo === 'F' && hasMoreApi && !loadingMore && next + PAGE_SIZE >= items.length) {
      fetchNextMoviePage()
    }
  }

  const filtered = items.filter(item => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      item.title.toLowerCase().includes(q) ||
      (item.author || '').toLowerCase().includes(q) ||
      (item.director || '').toLowerCase().includes(q)
    )
  })

  const visible  = filtered.slice(0, visibleCount)
  const hasMore  = filtered.length > visibleCount || (hasMoreApi && tipo === 'F' && !query)

  function handleItemClick(apiItem) {
    const userEntry = userLibrary.find(
      ui => ui.items?.api_id === apiItem.api_id && ui.items?.type === apiItem.type
    )
    onItemClick(userEntry ? userEntry.items : apiItem, userEntry || null)
  }

  return (
    <div style={{ marginTop: 8 }}>
      <span className="bib-t">Biblioteca</span>
      <input
        className="bib-srch"
        placeholder="Buscar no catálogo..."
        value={query}
        onChange={e => handleQueryChange(e.target.value)}
      />
      <div className="cats">
        {cats.map(cat => (
          <button
            key={cat}
            className={`cat${activeCat === cat ? ' on' : ''}`}
            onClick={() => setActiveCat(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <GridSkeleton />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0 24px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>{tipo === 'L' ? '📚' : '🎬'}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>
            {query ? 'Nenhum resultado' : 'Não foi possível carregar o catálogo'}
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.55 }}>
            {query ? 'Tente outro termo' : 'Verifique sua conexão e recarregue'}
          </div>
        </div>
      ) : (
        <>
          <div className="grid-sw">
            <div className="grid-h">
              {visible.map(item => (
                <GridCard
                  key={`${item.type}_${item.api_id}`}
                  item={item}
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </div>
          </div>
          {hasMore && (
            <button className="ver-mais" onClick={handleVerMais} disabled={loadingMore}>
              {loadingMore ? 'Carregando...' : `Ver mais${filtered.length > visibleCount ? ` (${filtered.length - visibleCount})` : ''}`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function Library({ session, onNavigate }) {
  const [profile, setProfile]     = useState(null)
  const [activeTab, setActiveTab] = useState('L')
  const [theme]                   = useState(() => localStorage.getItem('tema') || 'D')
  const [allItems, setAllItems]   = useState([])

  const frase = getDailyFrase()

  useEffect(() => {
    supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [session.user.id])

  useEffect(() => {
    supabase
      .from('user_items')
      .select('*, items(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setAllItems(data || []))
  }, [session.user.id])

  const themeClass = theme === 'L' ? 'light' : 'dark'
  const initial = (profile?.full_name || profile?.username || session.user.email || '?')[0].toUpperCase()

  const bookItems  = allItems.filter(ui => ui.items?.type === 'book')
  const movieItems = allItems.filter(ui => ui.items?.type === 'movie')

  const reading     = bookItems.filter(ui => ui.status === 'reading')
  const wantToRead  = bookItems.filter(ui => ui.status === 'want_to_read')
  const read        = bookItems.filter(ui => ui.status === 'read')
  const watching    = movieItems.filter(ui => ui.status === 'watching')
  const wantToWatch = movieItems.filter(ui => ui.status === 'want_to_watch')
  const watched     = movieItems.filter(ui => ui.status === 'watched')

  function goToItem(item, userItem) {
    onNavigate('item', { item, userItem })
  }

  function goToSearch() {
    onNavigate('search')
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

        {/* Topbar */}
        <div className="topbar">
          <div className="logo">marca<em>·página</em></div>
          <div className="av" style={profile?.avatar_url ? { padding: 0, overflow: 'hidden' } : {}}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initial}
          </div>
        </div>

        {/* Frase do dia */}
        <div className="qbox">
          <div className="qbig">"</div>
          <div className="qt">{frase.t}</div>
          <div className="qa">— {frase.a}</div>
        </div>

        <div className="gl" />

        {/* Abas */}
        <div className="mtabs">
          <div className={`mt${activeTab === 'L' ? ' on' : ''}`} onClick={() => setActiveTab('L')}>📚 Livros</div>
          <div className={`mt${activeTab === 'F' ? ' on' : ''}`} onClick={() => setActiveTab('F')}>🎬 Filmes</div>
        </div>

        {/* Livros */}
        <div className="sc" style={{ display: activeTab === 'L' ? undefined : 'none' }}>
          <StatusSection label="Lendo"     badgeClass="BL" dotClass="DL" userItems={reading}    onItemClick={goToItem} onAddClick={goToSearch} />
          <StatusSection label="Quero Ler" badgeClass="BQ" dotClass="DQ" userItems={wantToRead} onItemClick={goToItem} onAddClick={goToSearch} />
          <StatusSection label="Lidos"     badgeClass="BD" dotClass="DD" userItems={read}        onItemClick={goToItem} onAddClick={goToSearch} />
          <LibrarySection tipo="L" userLibrary={allItems} onItemClick={goToItem} />
        </div>

        {/* Filmes */}
        <div className="sc" style={{ display: activeTab === 'F' ? undefined : 'none' }}>
          <StatusSection label="Assistindo" badgeClass="BL" dotClass="DL" userItems={watching}    onItemClick={goToItem} onAddClick={goToSearch} />
          <StatusSection label="Quero Ver"  badgeClass="BQ" dotClass="DQ" userItems={wantToWatch} onItemClick={goToItem} onAddClick={goToSearch} />
          <StatusSection label="Assistidos" badgeClass="BD" dotClass="DD" userItems={watched}     onItemClick={goToItem} onAddClick={goToSearch} />
          <LibrarySection tipo="F" userLibrary={allItems} onItemClick={goToItem} />
        </div>

        {/* Bottom navigation */}
        <div className="bnav">
          <div className="ni on">
            <span className="nic">📚</span>
            <span className="nla">Biblioteca</span>
          </div>
          <div className="ni">
            <span className="nic">👥</span>
            <span className="nla">Comunidade</span>
          </div>
          <div className="ni" onClick={goToSearch}>
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
