import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { CURATED_BOOKS, CURATED_MOVIES } from '../data/curatedList'

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

const COVER_COLORS = ['c1','c2','c3','c4','c5','c6','c7','c8','c9']
const FILM_COLORS  = ['f1','f2','f3','f4','f5','f6']

function BookCover({ coverId, coverUrl, title }) {
  const [err, setErr] = useState(false)
  const src = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : (coverUrl || null)
  if (src && !err) {
    return <img className="srcov" src={src} alt="" onError={() => setErr(true)} />
  }
  const initials = title.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const cls = COVER_COLORS[title.charCodeAt(0) % COVER_COLORS.length]
  return (
    <div className={`srcov ${cls}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 13 }}>{initials}</span>
    </div>
  )
}

function MovieCover({ posterPath, coverUrl, title }) {
  const [err, setErr] = useState(false)
  const src = posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : (coverUrl || null)
  if (src && !err) {
    return <img className="srcov" src={src} alt="" onError={() => setErr(true)} />
  }
  const initials = title.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const cls = FILM_COLORS[title.charCodeAt(0) % FILM_COLORS.length]
  return (
    <div className={`srcov ${cls}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 13 }}>{initials}</span>
    </div>
  )
}

function AddButton({ status, onClick }) {
  if (status === 'loading') {
    return (
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(196,184,232,.2)', border: '1px solid rgba(196,184,232,.35)',
        color: 'var(--muted)', fontSize: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>…</div>
    )
  }
  if (status === 'added') {
    return (
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(122,170,138,.2)', border: '1px solid rgba(122,170,138,.5)',
        color: '#7AAA8A', fontSize: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>✓</div>
    )
  }
  if (status === 'exists') {
    return (
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(196,184,232,.08)', border: '1px solid rgba(196,184,232,.18)',
        color: 'var(--muted)', fontSize: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>✓</div>
    )
  }
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(196,184,232,.2)', border: '1px solid rgba(196,184,232,.35)',
        color: 'var(--accent)', fontSize: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}
    >+</div>
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
            <div style={{ height: 9,  borderRadius: 6, background: 'var(--sur2)', width: '28%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY
const GB_KEY   = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

function gbCanRequest() {
  const today = new Date().toISOString().slice(0, 10)
  if (localStorage.getItem('gb_req_date') !== today) {
    localStorage.setItem('gb_req_date', today)
    localStorage.setItem('gb_req_count', '0')
    return true
  }
  return parseInt(localStorage.getItem('gb_req_count') || '0') < 990
}

function gbIncrementCount() {
  localStorage.setItem(
    'gb_req_count',
    String(parseInt(localStorage.getItem('gb_req_count') || '0') + 1)
  )
}

function normalizeStr(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Normaliza com remoção de acentos — usado para comparar com lista curada
function normalizeTitleForCurated(s) {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '')
}

const CURATED_BOOK_TITLES  = new Set(CURATED_BOOKS.map(b => normalizeTitleForCurated(b.title)))
const CURATED_MOVIE_TITLES = new Set(CURATED_MOVIES.map(m => normalizeTitleForCurated(m.title)))

export default function Search({ session, onNavigate }) {
  const [profile, setProfile]           = useState(null)
  const [activeTab, setActiveTab]       = useState('L')
  const [theme]                         = useState(() => localStorage.getItem('tema') || 'D')

  // Livros
  const [bookQuery,    setBookQuery]    = useState('')
  const [bookResults,  setBookResults]  = useState([])
  const [bookLoading,  setBookLoading]  = useState(false)
  const [bookSearched, setBookSearched] = useState(false)
  const [gbUsed,       setGbUsed]       = useState(false)

  // Filmes
  const [movieQuery,    setMovieQuery]    = useState('')
  const [movieResults,  setMovieResults]  = useState([])
  const [movieLoading,  setMovieLoading]  = useState(false)
  const [movieSearched, setMovieSearched] = useState(false)

  // Status do botão + por chave "book_<key>" | "movie_<id>"
  const [itemStatus,      setItemStatus]      = useState({})
  const [userLibraryKeys, setUserLibraryKeys] = useState(new Set())

  const bookDebounce  = useRef(null)
  const movieDebounce = useRef(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [session.user.id])

  // Pré-carrega chaves da biblioteca do usuário para indicador visual nos resultados
  useEffect(() => {
    supabase
      .from('user_items')
      .select('items(type, api_id)')
      .eq('user_id', session.user.id)
      .then(({ data }) => {
        if (!data) return
        const keys = new Set(
          data.flatMap(ui => ui.items ? [`${ui.items.type}_${ui.items.api_id}`] : [])
        )
        setUserLibraryKeys(keys)
      })
  }, [session.user.id])

  const themeClass = theme === 'L' ? 'light' : 'dark'
  const initial = (profile?.full_name || profile?.username || session.user.email || '?')[0].toUpperCase()

  // ── Busca livros (Open Library + Google Books) ───────────────
  function handleBookInput(e) {
    const val = e.target.value
    setBookQuery(val)
    clearTimeout(bookDebounce.current)
    if (!val.trim()) {
      setBookResults([])
      setBookSearched(false)
      setBookLoading(false)
      return
    }
    setBookLoading(true)
    bookDebounce.current = setTimeout(async () => {
      setBookSearched(true)
      const term = val.trim()
      const useGB = gbCanRequest()
      if (useGB) gbIncrementCount()
      setGbUsed(useGB)
      try {
        const [olDocs, gbItems, manualRows] = await Promise.all([
          fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(term)}&lang=por&limit=20`)
            .then(r => r.json())
            .then(d => d.docs || [])
            .catch(() => []),
          useGB
            ? fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(term)}&langRestrict=pt&maxResults=20&key=${GB_KEY}`)
                .then(r => r.json())
                .then(d => (d.items || []).map(item => ({
                  key:                `gb_${item.id}`,
                  title:              item.volumeInfo.title || '',
                  author_name:        item.volumeInfo.authors || null,
                  first_publish_year: item.volumeInfo.publishedDate
                    ? parseInt(item.volumeInfo.publishedDate)
                    : null,
                  cover_i:            null,
                  language:           ['por'],
                  _source:            'google',
                  _gbId:              item.id,
                  _cover_url:         item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
                  _synopsis:          item.volumeInfo.description || null,
                })))
                .catch(() => [])
            : Promise.resolve([]),
          supabase
            .from('items')
            .select('*')
            .eq('is_manual', true)
            .eq('type', 'book')
            .or(`title.ilike.%${term}%,author.ilike.%${term}%`)
            .limit(10)
            .then(({ data }) => (data || []).map(r => ({
              key:               r.api_id,
              title:             r.title,
              author_name:       r.author ? [r.author] : null,
              first_publish_year: r.year || null,
              cover_i:           null,
              _cover_url:        r.cover_url || null,
              _isManual:         true,
            })))
            .catch(() => []),
        ])

        // Dedup por título+autor normalizado
        const dedupKey = b => normalizeStr(b.title) + '_' + normalizeStr(b.author_name?.[0])
        const olKeysSet = new Set(olDocs.map(dedupKey))
        const filteredGB = gbItems.filter(b => !olKeysSet.has(dedupKey(b)))

        // Ordenar: OL português → Google Books (já em pt) → OL outros idiomas
        const ptOL    = olDocs.filter(b => b.language?.includes('por'))
        const nonPtOL = olDocs.filter(b => !b.language?.includes('por'))
        const combined = [...ptOL, ...filteredGB, ...nonPtOL]

        const seenKeys = new Set(combined.map(b => b.key))
        const merged = [...combined, ...manualRows.filter(m => !seenKeys.has(m.key))]
        // Curated titles aparecem primeiro
        const boosted = [...merged].sort((a, b) => {
          const aInC = CURATED_BOOK_TITLES.has(normalizeTitleForCurated(a.title)) ? 0 : 1
          const bInC = CURATED_BOOK_TITLES.has(normalizeTitleForCurated(b.title)) ? 0 : 1
          return aInC - bInC
        })
        setBookResults(boosted)

        // Pré-popular status para itens já na biblioteca
        const initial = {}
        merged.forEach(book => {
          const apiId = book._source === 'google' ? book._gbId : book.key
          if (userLibraryKeys.has(`book_${apiId}`)) initial[`book_${apiId}`] = 'exists'
        })
        if (Object.keys(initial).length > 0) setItemStatus(s => ({ ...s, ...initial }))
      } catch {
        setBookResults([])
      } finally {
        setBookLoading(false)
      }
    }, 500)
  }

  // ── Busca filmes (TMDB) ───────────────────────────────────────
  function handleMovieInput(e) {
    const val = e.target.value
    setMovieQuery(val)
    clearTimeout(movieDebounce.current)
    if (!val.trim()) {
      setMovieResults([])
      setMovieSearched(false)
      setMovieLoading(false)
      return
    }
    setMovieLoading(true)
    movieDebounce.current = setTimeout(async () => {
      setMovieSearched(true)
      const term = val.trim()
      try {
        const [tmdbResults, manualRows] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(term)}&language=pt-BR&api_key=${TMDB_KEY}`)
            .then(r => r.json())
            .then(d => {
              const results = (d.results || []).slice(0, 10)
              results.sort((a, b) => {
                const aPt = a.original_language === 'pt' ? 0 : 1
                const bPt = b.original_language === 'pt' ? 0 : 1
                return aPt - bPt
              })
              return results
            })
            .catch(() => []),
          supabase
            .from('items')
            .select('*')
            .eq('is_manual', true)
            .eq('type', 'movie')
            .or(`title.ilike.%${term}%,director.ilike.%${term}%`)
            .limit(10)
            .then(({ data }) => (data || []).map(r => ({
              id:             r.api_id,
              title:          r.title,
              original_title: null,
              release_date:   r.year ? `${r.year}-01-01` : null,
              poster_path:    null,
              _cover_url:     r.cover_url || null,
              _isManual:      true,
            })))
            .catch(() => []),
        ])
        // Mesclar sem duplicatas por id (string)
        const seen = new Set(tmdbResults.map(m => String(m.id)))
        const merged = [...tmdbResults, ...manualRows.filter(m => !seen.has(String(m.id)))]
        // Curated titles aparecem primeiro
        const boosted = [...merged].sort((a, b) => {
          const aInC = CURATED_MOVIE_TITLES.has(normalizeTitleForCurated(a.title)) ? 0 : 1
          const bInC = CURATED_MOVIE_TITLES.has(normalizeTitleForCurated(b.title)) ? 0 : 1
          return aInC - bInC
        })
        setMovieResults(boosted)
        const initial = {}
        merged.forEach(movie => {
          if (userLibraryKeys.has(`movie_${String(movie.id)}`)) initial[`movie_${movie.id}`] = 'exists'
        })
        if (Object.keys(initial).length > 0) setItemStatus(s => ({ ...s, ...initial }))
      } catch {
        setMovieResults([])
      } finally {
        setMovieLoading(false)
      }
    }, 500)
  }

  // ── Adicionar livro ao Supabase ───────────────────────────────
  async function addBook(book) {
    const isGB  = book._source === 'google'
    const apiId = isGB ? book._gbId : book.key
    const key   = `book_${apiId}`
    setItemStatus(s => ({ ...s, [key]: 'loading' }))
    try {
      let { data: existing } = await supabase
        .from('items')
        .select('id')
        .eq('type', 'book')
        .eq('api_id', apiId)
        .maybeSingle()

      let itemId
      if (!existing) {
        const { data: inserted, error } = await supabase
          .from('items')
          .insert({
            type:       'book',
            api_id:     apiId,
            title:      book.title,
            author:     book.author_name?.join(', ') || null,
            year:       book.first_publish_year || null,
            cover_url:  isGB
              ? book._cover_url
              : book.cover_i
                ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
                : book._cover_url || null,
            api_source: isGB ? 'google_books' : 'openlibrary',
          })
          .select('id')
          .single()
        if (error) throw error
        itemId = inserted.id
      } else {
        itemId = existing.id
      }

      const { data: userItem } = await supabase
        .from('user_items')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('item_id', itemId)
        .maybeSingle()

      if (userItem) {
        setItemStatus(s => ({ ...s, [key]: 'exists' }))
        return
      }

      const { error: uiErr } = await supabase
        .from('user_items')
        .insert({ user_id: session.user.id, item_id: itemId, status: 'want_to_read' })
      if (uiErr) throw uiErr

      setItemStatus(s => ({ ...s, [key]: 'added' }))
    } catch (err) {
      console.error('addBook:', err)
      setItemStatus(s => ({ ...s, [key]: null }))
    }
  }

  // ── Adicionar filme ao Supabase ───────────────────────────────
  async function addMovie(movie) {
    const apiId = String(movie.id)
    const key   = `movie_${apiId}`
    setItemStatus(s => ({ ...s, [key]: 'loading' }))
    try {
      let { data: existing } = await supabase
        .from('items')
        .select('id')
        .eq('type', 'movie')
        .eq('api_id', apiId)
        .maybeSingle()

      let itemId
      if (!existing) {
        const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null
        const { data: inserted, error } = await supabase
          .from('items')
          .insert({
            type:       'movie',
            api_id:     apiId,
            title:      movie.title,
            year,
            cover_url:  movie.poster_path
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
              : null,
            api_source: 'tmdb',
          })
          .select('id')
          .single()
        if (error) throw error
        itemId = inserted.id
      } else {
        itemId = existing.id
      }

      const { data: userItem } = await supabase
        .from('user_items')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('item_id', itemId)
        .maybeSingle()

      if (userItem) {
        setItemStatus(s => ({ ...s, [key]: 'exists' }))
        return
      }

      const { error: uiErr } = await supabase
        .from('user_items')
        .insert({ user_id: session.user.id, item_id: itemId, status: 'want_to_watch' })
      if (uiErr) throw uiErr

      setItemStatus(s => ({ ...s, [key]: 'added' }))
    } catch (err) {
      console.error('addMovie:', err)
      setItemStatus(s => ({ ...s, [key]: null }))
    }
  }

  // ── Render ────────────────────────────────────────────────────
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

        <div className="gl" />

        {/* Abas */}
        <div className="mtabs">
          <div className={`mt${activeTab === 'L' ? ' on' : ''}`} onClick={() => setActiveTab('L')}>📚 Livros</div>
          <div className={`mt${activeTab === 'F' ? ' on' : ''}`} onClick={() => setActiveTab('F')}>🎬 Filmes</div>
        </div>

        {/* ── Aba Livros (Open Library) ── */}
        <div className="sc" style={{ display: activeTab === 'L' ? undefined : 'none' }}>
          <div className="srch">
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>🔍</span>
            <input
              placeholder="Buscar por título ou autor..."
              value={bookQuery}
              onChange={handleBookInput}
            />
          </div>

          {bookLoading && <SkeletonList />}

          {!bookLoading && !bookSearched && (
            <div style={{ textAlign: 'center', padding: '52px 0 24px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>Busque por título ou autor</div>
              <div style={{ fontSize: 11, lineHeight: 1.65 }}>Resultados em tempo real da Open Library + Google Books</div>
            </div>
          )}

          {!bookLoading && bookSearched && bookResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '52px 0 24px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>😶</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>Nenhum resultado</div>
              <div style={{ fontSize: 11, lineHeight: 1.65 }}>Tente outro título ou autor</div>
            </div>
          )}

          {!bookLoading && bookResults.length > 0 && (
            <>
              <div className="slb">Resultados · Open Library{gbUsed ? ' + Google Books' : ''}</div>
              {bookResults.map((book, i) => {
                const apiId = book._source === 'google' ? book._gbId : book.key
                const k  = `book_${apiId}`
                const st = itemStatus[k]
                return (
                  <div key={book.key || i} className="srr">
                    <BookCover coverId={book.cover_i} coverUrl={book._cover_url} title={book.title} />
                    <div className="srm">
                      <div className="srt">{book.title}</div>
                      <div className="sra">{book.author_name?.join(', ') || 'Autor desconhecido'}</div>
                      {book.first_publish_year && <div className="sry">{book.first_publish_year}</div>}
                      {book._isManual && <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--accent)', marginTop: 3, letterSpacing: '0.05em' }}>MANUAL</div>}
                      {st === 'added'  && <div style={{ fontSize: 10, color: '#7AAA8A', fontWeight: 700, marginTop: 2 }}>Adicionado!</div>}
                      {st === 'exists' && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Já está na sua biblioteca</div>}
                    </div>
                    <AddButton status={st} onClick={() => addBook(book)} />
                  </div>
                )
              })}
              <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>Não encontrou? Adicione manualmente</div>
                <button style={{
                  padding: '10px 24px', borderRadius: 12,
                  border: '1.5px dashed var(--add-bor)', background: 'var(--add-bg)',
                  color: 'var(--accent)', fontFamily: "'Figtree', sans-serif",
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>📷 Adicionar com foto</button>
              </div>
            </>
          )}
        </div>

        {/* ── Aba Filmes (TMDB) ── */}
        <div className="sc" style={{ display: activeTab === 'F' ? undefined : 'none' }}>
          <div className="srch">
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>🔍</span>
            <input
              placeholder="Buscar por título do filme..."
              value={movieQuery}
              onChange={handleMovieInput}
            />
          </div>

          {movieLoading && <SkeletonList />}

          {!movieLoading && !movieSearched && (
            <div style={{ textAlign: 'center', padding: '52px 0 24px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>🎬</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>Busque por título de filme</div>
              <div style={{ fontSize: 11, lineHeight: 1.65 }}>Resultados em tempo real do TMDB</div>
            </div>
          )}

          {!movieLoading && movieSearched && movieResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '52px 0 24px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>😶</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>Nenhum resultado</div>
              <div style={{ fontSize: 11, lineHeight: 1.65 }}>Tente outro título</div>
            </div>
          )}

          {!movieLoading && movieResults.length > 0 && (
            <>
              <div className="slb">Resultados · TMDB</div>
              {movieResults.map((movie, i) => {
                const k    = `movie_${movie.id}`
                const st   = itemStatus[k]
                const year = movie.release_date ? movie.release_date.split('-')[0] : null
                const showOriginal = movie.original_title && movie.original_title !== movie.title
                return (
                  <div key={movie.id || i} className="srr">
                    <MovieCover posterPath={movie.poster_path} coverUrl={movie._cover_url} title={movie.title} />
                    <div className="srm">
                      <div className="srt">{movie.title}</div>
                      {showOriginal && <div className="sra">{movie.original_title}</div>}
                      {year && <div className="sry">{year}</div>}
                      {movie._isManual && <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--accent)', marginTop: 3, letterSpacing: '0.05em' }}>MANUAL</div>}
                      {st === 'added'  && <div style={{ fontSize: 10, color: '#7AAA8A', fontWeight: 700, marginTop: 2 }}>Adicionado!</div>}
                      {st === 'exists' && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Já está na sua biblioteca</div>}
                    </div>
                    <AddButton status={st} onClick={() => addMovie(movie)} />
                  </div>
                )
              })}
            </>
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
