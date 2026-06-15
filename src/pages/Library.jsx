import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { CURATED_BOOKS, CURATED_MOVIES } from '../data/curatedList'
import ShelvesSection from '../components/books/ShelvesSection'
import NotificationBell from '../components/NotificationBell'

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY
const GB_KEY   = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
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

// Fase 2 — Google Books subjects rotativos (startIndex até 1000, depois próximo subject)
const GB_SUBJECTS = [
  { q: 'subject:fiction',    cat: 'Lit. Internacional' },
  { q: 'subject:history',    cat: 'História' },
  { q: 'subject:biography',  cat: 'Biografia' },
  { q: 'subject:science',    cat: 'Ficção Científica' },
  { q: 'subject:romance',    cat: 'Romance' },
  { q: 'subject:philosophy', cat: 'Filosofia' },
  { q: 'subject:literature', cat: 'Lit. Internacional' },
]

// Fase 2 — TMDB endpoints rotativos
const TMDB_ENDPOINTS = ['popular', 'top_rated', 'now_playing']

const TMDB_GENRE_CAT = {
  28: 'Ação', 12: 'Outros', 16: 'Animação', 35: 'Comédia', 80: 'Crime',
  99: 'Documentário', 18: 'Drama', 10751: 'Outros', 14: 'Outros', 36: 'Histórico',
  27: 'Terror', 10402: 'Outros', 9648: 'Suspense', 10749: 'Romance',
  878: 'Ficção Científica', 53: 'Suspense', 10770: 'Outros', 37: 'Outros',
}

function normalizeStr(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function itemKeys(item) {
  const keys = []
  if (item.api_id) keys.push(`${item.type}_${item.api_id}`)
  const nt = normalizeStr(item.title)
  const na = normalizeStr(item.author || item.director || '')
  if (nt) keys.push(`${item.type}_t${nt}_a${na}`)
  return keys
}

function isInSet(item, set) {
  return itemKeys(item).some(k => set.has(k))
}

function addToSet(item, set) {
  itemKeys(item).forEach(k => set.add(k))
}

function olDocCategory(doc) {
  const s = (Array.isArray(doc.subject) ? doc.subject : []).join(' ').toLowerCase()
  if (s.includes('brasil') || s.includes('brazil'))                     return 'Lit. Brasileira'
  if (s.includes('science fiction') || s.includes('ficção científica')) return 'Ficção Científica'
  if (s.includes('fantasy') || s.includes('fantasia'))                  return 'Fantasia'
  if (s.includes('mystery') || s.includes('crime') || s.includes('policial')) return 'Policial'
  if (s.includes('history') || s.includes('história'))                  return 'História'
  if (s.includes('philosophy') || s.includes('filosofia'))              return 'Filosofia'
  if (s.includes('biography') || s.includes('biografia'))               return 'Biografia'
  if (s.includes('psychology') || s.includes('psicologia'))             return 'Psicologia'
  if (s.includes('romance'))                                             return 'Romance'
  if (s.includes('business') || s.includes('negócios'))                 return 'Negócios'
  return 'Lit. Internacional'
}

function mapBooks(works) {
  return works.map(w => ({
    type: 'book',
    api_id: w.key,
    api_source: 'openlibrary',
    title: w.title,
    author: Array.isArray(w.author_name) ? w.author_name[0] : 'Autor desconhecido',
    year: w.first_publish_year || null,
    cover_url: w.cover_i ? `https://covers.openlibrary.org/b/id/${w.cover_i}-M.jpg` : null,
    subjects: Array.isArray(w.subject) ? w.subject : [],
  }))
}

function mapMovies(results) {
  return results.map(m => ({
    type: 'movie',
    api_id: String(m.id),
    api_source: 'tmdb',
    title: m.title,
    director: null,
    year: m.release_date ? Number(m.release_date.split('-')[0]) : null,
    cover_url: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null,
    genre_ids: m.genre_ids || [],
    overview: m.overview || null,
  }))
}

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
  const touch = useRef({ moved: false, x: 0, y: 0 })

  function handleTouchStart(e) {
    const t = e.touches[0]
    touch.current = { moved: false, x: t.clientX, y: t.clientY }
  }
  function handleTouchMove(e) {
    const t = e.touches[0]
    if (Math.abs(t.clientX - touch.current.x) > 10 || Math.abs(t.clientY - touch.current.y) > 10) {
      touch.current.moved = true
    }
  }
  function handleTouchEnd(e) {
    if (touch.current.moved) return
    e.preventDefault()
    onClick()
  }

  return (
    <div
      className="bc"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
    >
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

function GridCard({ item, onClick, inLibrary }) {
  const [imgErr, setImgErr] = useState(false)
  const initials = item.title.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const colors = item.type === 'movie' ? FILM_COLORS : COVER_COLORS
  const cls = colors[item.title.charCodeAt(0) % colors.length]
  const touch = useRef({ moved: false, x: 0, y: 0 })

  function handleTouchStart(e) {
    const t = e.touches[0]
    touch.current = { moved: false, x: t.clientX, y: t.clientY }
  }
  function handleTouchMove(e) {
    const t = e.touches[0]
    if (Math.abs(t.clientX - touch.current.x) > 10 || Math.abs(t.clientY - touch.current.y) > 10) {
      touch.current.moved = true
    }
  }
  function handleTouchEnd(e) {
    if (touch.current.moved) return
    e.preventDefault()
    onClick()
  }

  return (
    <div
      className="gc"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      style={{ position: 'relative' }}
    >
      {item.cover_url && !imgErr ? (
        <img className="gcov" src={item.cover_url} alt="" style={{ objectFit: 'cover' }} onError={() => setImgErr(true)} />
      ) : (
        <div className={`gcov ${cls}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 13 }}>{initials}</span>
        </div>
      )}
      {item.is_manual && (
        <div style={{
          position: 'absolute', top: 3, left: 3,
          background: 'rgba(196,168,240,0.92)', color: '#1A1720',
          fontSize: 7, fontWeight: 800, padding: '2px 4px', borderRadius: 4,
          letterSpacing: '0.05em', zIndex: 2, textTransform: 'uppercase',
        }}>Manual</div>
      )}
      {inLibrary && (
        <div style={{
          position: 'absolute', top: 3, right: 3,
          width: 16, height: 16, borderRadius: '50%',
          background: 'var(--accent)', color: '#1A1720',
          fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2,
        }}>✓</div>
      )}
      <div className="gtit">{item.title}</div>
      {(item.author || item.director) && <div className="gaut">{item.author || item.director}</div>}
    </div>
  )
}

function StatusSection({ label, badgeClass, dotClass, userItems, onItemClick, onAddClick }) {
  const rowRef = useRef(null)
  const drag   = useRef({ active: false, x: 0, scroll: 0 })

  function onRowMouseDown(e) {
    if (!rowRef.current) return
    drag.current = { active: true, x: e.pageX, scroll: rowRef.current.scrollLeft }
    rowRef.current.style.cursor = 'grabbing'
  }
  function onRowMouseMove(e) {
    if (!drag.current.active || !rowRef.current) return
    e.preventDefault()
    rowRef.current.scrollLeft = drag.current.scroll - (e.pageX - drag.current.x)
  }
  function onRowMouseUp() {
    drag.current.active = false
    if (rowRef.current) rowRef.current.style.cursor = 'grab'
  }

  return (
    <div className="ss">
      <div className="sh">
        <div className={`sb ${badgeClass}`}>
          <div className={`dot ${dotClass}`} />
          {label}
        </div>
        {userItems.length > 0 && <span className="sc-n">{userItems.length}</span>}
      </div>
      <div
        className="brow"
        ref={rowRef}
        style={{ cursor: 'grab', userSelect: 'none' }}
        onMouseDown={onRowMouseDown}
        onMouseMove={onRowMouseMove}
        onMouseUp={onRowMouseUp}
        onMouseLeave={onRowMouseUp}
      >
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

function LibrarySection({ tipo, userLibrary, onItemClick, onManualAdd }) {
  const [curatedItems, setCuratedItems] = useState([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore]     = useState(false)
  const [activeCat, setActiveCat]         = useState('Todos')
  const [query, setQuery]                 = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  const sentinelRef    = useRef(null)
  const gridWrapRef    = useRef(null)
  const gridDrag       = useRef({ active: false, startY: 0, startX: 0, scrollTop: 0 })
  const searchDebounce = useRef(null)

  // Phase 1 refs
  const srcCursorRef   = useRef(0)
  const canLoadMoreRef = useRef(true)
  const isLoadingRef   = useRef(false)
  const loadMoreFnRef  = useRef(null)

  // Phase 2 refs
  const phase2ActiveRef  = useRef(false)
  const olPageRef        = useRef(1)         // OL q=* página global
  const gbQueryIdxRef    = useRef(0)         // índice do subject GB (% GB_SUBJECTS.length)
  const gbStartIdxRef    = useRef(0)         // startIndex GB (0–1000 por subject)
  const tmdbEndpointRef  = useRef(0)         // índice do endpoint TMDB (% 3)
  const tmdbPagesRef     = useRef([1, 1, 1]) // página por endpoint [popular, top_rated, now_playing]
  const manualFetchedRef = useRef(false)
  const seenKeysRef      = useRef(new Set())

  const cats       = tipo === 'L' ? CATS_LIVROS : CATS_FILMES
  const cacheKey   = tipo === 'L' ? 'curated_cache_books_v2' : 'curated_cache_movies_v2'
  const itemType   = tipo === 'L' ? 'book' : 'movie'
  const curatedSrc = tipo === 'L' ? CURATED_BOOKS : CURATED_MOVIES

  const userItemsForTipo = userLibrary.filter(ui => ui.items?.type === itemType)
  const hasUserItems     = userItemsForTipo.length > 0
  const userApiIds       = new Set(userItemsForTipo.map(ui => `${ui.items?.type}_${ui.items?.api_id}`))

  // Phase 1: fetch PAGE_SIZE curated titles
  async function fetchBatch(startIdx) {
    const slice = curatedSrc.slice(startIdx, startIdx + PAGE_SIZE)
    if (slice.length === 0) return []
    const fetches = slice.map(ci => {
      if (tipo === 'L') {
        return fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(ci.title)}&limit=3`)
          .then(r => r.json())
          .then(data => {
            const docs = data.docs || []
            const withCover = docs.find(d => d.cover_i)
            const doc = withCover || docs[0]
            if (!doc) return null
            return {
              type: 'book', api_id: doc.key, api_source: 'openlibrary',
              title: doc.title,
              author: Array.isArray(doc.author_name) ? doc.author_name[0] : ci.author_director,
              year: doc.first_publish_year || ci.year,
              cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
              subjects: Array.isArray(doc.subject) ? doc.subject : [],
              _curatedCategory: ci.category,
              _curatedTitle: ci.title,
            }
          })
          .catch(() => null)
      } else {
        return fetch(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(ci.title)}&language=pt-BR&api_key=${TMDB_KEY}&page=1`)
          .then(r => r.json())
          .then(data => {
            const results = data.results || []
            const byYear  = results.find(r => r.release_date?.startsWith(String(ci.year)))
            const movie   = byYear || results[0]
            if (!movie) return null
            return {
              type: 'movie', api_id: String(movie.id), api_source: 'tmdb',
              title: movie.title,
              director: ci.author_director,
              year: movie.release_date ? Number(movie.release_date.split('-')[0]) : ci.year,
              cover_url: movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : null,
              genre_ids: movie.genre_ids || [],
              overview: movie.overview || null,
              _curatedCategory: ci.category,
              _curatedTitle: ci.title,
            }
          })
          .catch(() => null)
      }
    })
    return (await Promise.all(fetches)).filter(Boolean)
  }

  // Phase 2: livros — OL q=* paginado globalmente + GB subjects rotativos
  async function fetchGenericBooksPage() {
    const olPage = olPageRef.current
    const olPromise = fetch(
      `https://openlibrary.org/search.json?q=*&page=${olPage}&limit=12`
    ).then(r => r.json()).then(data => {
      const docs = data.docs || []
      olPageRef.current = docs.length === 0 ? 1 : olPage + 1
      return docs.map(doc => ({
        type: 'book', api_id: doc.key, api_source: 'openlibrary',
        title: doc.title,
        author: Array.isArray(doc.author_name) ? doc.author_name[0] : 'Autor desconhecido',
        year: doc.first_publish_year || null,
        cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
        subjects: Array.isArray(doc.subject) ? doc.subject : [],
        _curatedCategory: olDocCategory(doc),
      }))
    }).catch(() => { olPageRef.current = olPage + 1; return [] })

    let gbPromise = Promise.resolve([])
    if (GB_KEY) {
      const gqi              = gbQueryIdxRef.current % GB_SUBJECTS.length
      const { q: gbQ, cat: gbCat } = GB_SUBJECTS[gqi]
      const gbStart          = gbStartIdxRef.current
      gbPromise = fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(gbQ)}&langRestrict=pt&startIndex=${gbStart}&maxResults=12&key=${GB_KEY}`
      ).then(r => r.json()).then(data => {
        const vols = data.items || []
        if (vols.length === 0 || gbStart >= 1000) {
          gbQueryIdxRef.current += 1
          gbStartIdxRef.current  = 0
        } else {
          gbStartIdxRef.current += 12
        }
        return vols.map(vol => ({
          type: 'book',
          api_id: vol.id,
          api_source: 'google_books',
          title: vol.volumeInfo?.title || '',
          author: vol.volumeInfo?.authors?.[0] || 'Autor desconhecido',
          year: vol.volumeInfo?.publishedDate
            ? Number(String(vol.volumeInfo.publishedDate).split('-')[0]) : null,
          cover_url: vol.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
          subjects: [],
          _curatedCategory: gbCat,
        }))
      }).catch(() => { gbQueryIdxRef.current += 1; gbStartIdxRef.current = 0; return [] })
    }

    const [olItems, gbItems] = await Promise.all([olPromise, gbPromise])
    return [...olItems, ...gbItems]
  }

  // Phase 2: filmes — popular / top_rated / now_playing rotativos, até 500 páginas cada
  async function fetchGenericMoviesPage() {
    const epIdx    = tmdbEndpointRef.current % TMDB_ENDPOINTS.length
    const endpoint = TMDB_ENDPOINTS[epIdx]
    const page     = tmdbPagesRef.current[epIdx]
    tmdbEndpointRef.current = epIdx + 1   // avança para o próximo endpoint na próxima chamada

    return fetch(
      `https://api.themoviedb.org/3/movie/${endpoint}?language=pt-BR&page=${page}&api_key=${TMDB_KEY}`
    ).then(r => r.json()).then(data => {
      const results  = data.results || []
      const newPages = [...tmdbPagesRef.current]
      newPages[epIdx] = (results.length === 0 || page >= 500) ? 1 : page + 1
      tmdbPagesRef.current = newPages
      return results.map(m => {
        const cat = (m.genre_ids || []).map(g => TMDB_GENRE_CAT[g]).find(Boolean) || 'Outros'
        return {
          type: 'movie', api_id: String(m.id), api_source: 'tmdb',
          title: m.title, director: null,
          year: m.release_date ? Number(m.release_date.split('-')[0]) : null,
          cover_url: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null,
          genre_ids: m.genre_ids || [],
          overview: m.overview || null,
          _curatedCategory: cat,
        }
      })
    }).catch(() => {
      const newPages = [...tmdbPagesRef.current]
      newPages[epIdx] = 1
      tmdbPagesRef.current = newPages
      return []
    })
  }

  async function doLoadMore() {
    if (!canLoadMoreRef.current || isLoadingRef.current) return
    isLoadingRef.current = true
    setLoadingMore(true)

    let needsRetry = false

    try {
      if (!phase2ActiveRef.current) {
        // Phase 1: curated list
        const cursor     = srcCursorRef.current
        const newItems   = await fetchBatch(cursor)
        const nextCursor = cursor + PAGE_SIZE
        const done       = nextCursor >= curatedSrc.length

        newItems.forEach(i => addToSet(i, seenKeysRef.current))

        setCuratedItems(prev => {
          const seen  = new Set(prev.map(i => `${i.type}_${i.api_id}`))
          const fresh = newItems.filter(i => !seen.has(`${i.type}_${i.api_id}`))
          const next  = [...prev, ...fresh]
          if (done) {
            try { sessionStorage.setItem(cacheKey, JSON.stringify(next)) } catch {}
          }
          return next
        })

        srcCursorRef.current = nextCursor
        if (done) phase2ActiveRef.current = true
      } else {
        // Phase 2: generic pagination + Supabase manual items
        const candidates = []

        if (!manualFetchedRef.current) {
          manualFetchedRef.current = true
          const { data } = await supabase
            .from('items').select('*').eq('is_manual', true).eq('type', itemType)
          ;(data || []).forEach(r => candidates.push({
            type: r.type, api_id: r.api_id, api_source: r.api_source,
            title: r.title, author: r.author || null, director: r.director || null,
            year: r.year || null, cover_url: r.cover_url || null,
            subjects: [], genre_ids: [], is_manual: true, _curatedCategory: 'Outros',
          }))
        }

        const generic = tipo === 'L'
          ? await fetchGenericBooksPage()
          : await fetchGenericMoviesPage()
        candidates.push(...generic)

        const fresh = candidates.filter(i => !isInSet(i, seenKeysRef.current))
        fresh.forEach(i => addToSet(i, seenKeysRef.current))
        setCuratedItems(prev => [...prev, ...fresh])

        // Se todos os itens retornados já foram vistos, o sentinela não sai da zona de
        // interseção e o IntersectionObserver não re-dispara — forçamos a próxima carga.
        if (fresh.length === 0) needsRetry = true
      }
    } finally {
      isLoadingRef.current = false
      setLoadingMore(false)
      if (needsRetry) setTimeout(() => loadMoreFnRef.current?.(), 1000)
    }
  }

  loadMoreFnRef.current = doLoadMore

  // Mount: load from cache or fetch first batch
  useEffect(() => {
    setCuratedItems([])
    srcCursorRef.current   = 0
    canLoadMoreRef.current = true  // always true — Phase 2 keeps going
    isLoadingRef.current   = true
    setInitialLoading(true)

    // Reset Phase 2 state
    phase2ActiveRef.current  = false
    olPageRef.current        = 1
    gbQueryIdxRef.current    = 0
    gbStartIdxRef.current    = 0
    tmdbEndpointRef.current  = 0
    tmdbPagesRef.current     = [1, 1, 1]
    manualFetchedRef.current = false
    seenKeysRef.current      = new Set()

    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try {
        const data = JSON.parse(cached)
        if (Array.isArray(data) && data.length > 0 && data[0]?._curatedCategory) {
          setCuratedItems(data)
          data.forEach(i => addToSet(i, seenKeysRef.current))
          srcCursorRef.current    = curatedSrc.length
          phase2ActiveRef.current = true
          isLoadingRef.current    = false
          setInitialLoading(false)
          return
        }
      } catch {}
      sessionStorage.removeItem(cacheKey)
    }

    fetchBatch(0).then(items => {
      const seen    = new Set()
      const deduped = items.filter(i => {
        const k = `${i.type}_${i.api_id}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      deduped.forEach(i => addToSet(i, seenKeysRef.current))
      setCuratedItems(deduped)
      srcCursorRef.current = PAGE_SIZE
      if (PAGE_SIZE >= curatedSrc.length) {
        phase2ActiveRef.current = true
        try { sessionStorage.setItem(cacheKey, JSON.stringify(deduped)) } catch {}
      }
    }).finally(() => {
      isLoadingRef.current = false
      setInitialLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo])

  // IntersectionObserver: sentinel triggers next batch indefinitely
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMoreFnRef.current() },
      { rootMargin: '600px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Category filter: continua carregando até ter pelo menos 9 itens visíveis na categoria
  useEffect(() => {
    if (activeCat === 'Todos' || isLoadingRef.current) return
    const ids = new Set(
      userLibrary.filter(ui => ui.items?.type === itemType).map(ui => `${ui.items?.type}_${ui.items?.api_id}`)
    )
    const catCount = curatedItems.filter(
      i => i._curatedCategory === activeCat && !ids.has(`${i.type}_${i.api_id}`)
    ).length
    if (catCount < 9) loadMoreFnRef.current()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCat, curatedItems.length, userLibrary.length])

  function handleCatChange(cat) {
    setActiveCat(cat)
    clearTimeout(searchDebounce.current)
    setQuery('')
    setSearchResults([])
    setSearchLoading(false)
  }

  // Bib-srch live search
  function handleQueryChange(e) {
    const val = e.target.value
    setQuery(val)
    clearTimeout(searchDebounce.current)
    if (!val.trim()) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    searchDebounce.current = setTimeout(async () => {
      const term = val.trim()
      try {
        const [apiResults, manualRows] = await Promise.all([
          (async () => {
            if (tipo === 'L') {
              const res  = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(term)}&limit=20`)
              const data = await res.json()
              return mapBooks(data.docs || [])
            }
            const res  = await fetch(
              `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(term)}&language=pt-BR&api_key=${TMDB_KEY}`
            )
            const data = await res.json()
            return mapMovies((data.results || []).slice(0, 20))
          })(),
          supabase
            .from('items')
            .select('*')
            .eq('is_manual', true)
            .eq('type', itemType)
            .or(`title.ilike.%${term}%,author.ilike.%${term}%,director.ilike.%${term}%`)
            .limit(20)
            .then(({ data }) => (data || []).map(r => ({
              type: r.type, api_id: r.api_id, api_source: r.api_source,
              title: r.title, author: r.author || null, director: r.director || null,
              year: r.year || null, cover_url: r.cover_url || null,
              subjects: [], genre_ids: [], is_manual: true,
            })))
            .catch(() => []),
        ])
        const seen = new Set(apiResults.map(r => `${r.type}_${r.api_id}`))
        setSearchResults([...apiResults, ...manualRows.filter(m => !seen.has(`${m.type}_${m.api_id}`))])
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 500)
  }

  // Grid drag (scrolls parent .sc vertically on desktop)
  function onGridMouseDown(e) {
    const sc = gridWrapRef.current?.closest('.sc')
    if (!sc) return
    gridDrag.current = { active: true, startY: e.pageY, startX: e.pageX, scrollTop: sc.scrollTop }
    if (gridWrapRef.current) gridWrapRef.current.style.cursor = 'grabbing'
  }
  function onGridMouseMove(e) {
    if (!gridDrag.current.active) return
    e.preventDefault()
    const sc = gridWrapRef.current?.closest('.sc')
    if (sc) sc.scrollTop = gridDrag.current.scrollTop - (e.pageY - gridDrag.current.startY)
  }
  function onGridMouseUp() {
    gridDrag.current.active = false
    if (gridWrapRef.current) gridWrapRef.current.style.cursor = 'grab'
  }

  // Compute display items
  const userCategories = new Set()
  curatedItems.forEach(ci => {
    if (userApiIds.has(`${ci.type}_${ci.api_id}`)) userCategories.add(ci._curatedCategory)
  })

  let displayItems = curatedItems.filter(item => {
    if (activeCat !== 'Todos' && item._curatedCategory !== activeCat) return false
    if (hasUserItems && userApiIds.has(`${item.type}_${item.api_id}`)) return false
    return true
  })

  if (hasUserItems && activeCat === 'Todos' && userCategories.size > 0) {
    displayItems = [...displayItems].sort((a, b) => {
      const aM = userCategories.has(a._curatedCategory) ? 0 : 1
      const bM = userCategories.has(b._curatedCategory) ? 0 : 1
      return aM - bM
    })
  }

  const isSearchMode = query.trim() !== ''
  const sectionLabel = hasUserItems ? 'Recomendados para você' : 'Sugestões'

  function handleItemClick(apiItem) {
    const userEntry = userLibrary.find(
      ui => ui.items?.api_id === apiItem.api_id && ui.items?.type === apiItem.type
    )
    onItemClick(userEntry ? userEntry.items : apiItem, userEntry || null)
  }

  const gridProps = {
    ref: gridWrapRef,
    className: 'grid-sw',
    onMouseDown: onGridMouseDown,
    onMouseMove: onGridMouseMove,
    onMouseUp: onGridMouseUp,
    onMouseLeave: onGridMouseUp,
  }

  return (
    <div style={{ marginTop: 8 }}>
      <span className="bib-t">Biblioteca</span>
      <input
        className="bib-srch"
        placeholder="Buscar no catálogo..."
        value={query}
        onChange={handleQueryChange}
      />
      <div className="cats">
        {cats.map(cat => (
          <button
            key={cat}
            className={`cat${activeCat === cat ? ' on' : ''}`}
            onClick={() => handleCatChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {initialLoading ? (
        <GridSkeleton />
      ) : isSearchMode ? (
        searchLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
            <div className="spin" />
          </div>
        ) : searchResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0 24px', color: 'var(--muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>{tipo === 'L' ? '📚' : '🎬'}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>Nenhum resultado</div>
            <div style={{ fontSize: 11, lineHeight: 1.55 }}>Tente outro termo</div>
          </div>
        ) : (
          <div {...gridProps}>
            <div className="grid-h">
              {searchResults.map(item => {
                const inLib = userLibrary.some(ui => ui.items?.api_id === item.api_id && ui.items?.type === item.type)
                return (
                  <GridCard
                    key={`${item.type}_${item.api_id}`}
                    item={item}
                    inLibrary={inLib}
                    onClick={() => handleItemClick(item)}
                  />
                )
              })}
            </div>
          </div>
        )
      ) : (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10 }}>
            {sectionLabel}
          </div>
          {displayItems.length === 0 && !loadingMore ? (
            <div style={{ textAlign: 'center', padding: '28px 0 24px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>{tipo === 'L' ? '📚' : '🎬'}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>
                {activeCat !== 'Todos' ? 'Nenhum item nessa categoria' : 'Não foi possível carregar as sugestões'}
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.55 }}>
                {activeCat !== 'Todos' ? 'Tente outra categoria ou "Todos"' : 'Verifique sua conexão e recarregue'}
              </div>
            </div>
          ) : (
            <div {...gridProps}>
              <div className="grid-h">
                {displayItems.map(item => {
                  const inLib = userLibrary.some(ui => ui.items?.api_id === item.api_id && ui.items?.type === item.type)
                  return (
                    <GridCard
                      key={`${item.type}_${item.api_id}`}
                      item={item}
                      inLibrary={inLib}
                      onClick={() => handleItemClick(item)}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Sentinel: always rendered so IntersectionObserver fires indefinitely */}
      <div ref={sentinelRef} style={{ height: 8 }} />

      {loadingMore && !isSearchMode && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 8px' }}>
          <div className="spin" />
        </div>
      )}

      {tipo === 'F' && onManualAdd && (
        <button className="addt" style={{ marginTop: 4 }} onClick={onManualAdd}>
          ＋ Não encontrei meu filme/série
        </button>
      )}
    </div>
  )
}

export default function Library({ session, onNavigate, reopen, onReopenConsumed }) {
  const [profile, setProfile]     = useState(null)
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('lib_active_tab') || 'L')
  const [theme]                   = useState(() => localStorage.getItem('tema') || 'D')
  const [allItems, setAllItems]   = useState([])
  const [shelfCounts, setShelfCounts] = useState({ reading: 0, want_to_read: 0, read: 0 })

  const frase = getDailyFrase()

  useEffect(() => {
    sessionStorage.setItem('lib_active_tab', activeTab)
  }, [activeTab])

  useEffect(() => {
    supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [session.user.id])

  const loadAllItems = useCallback(() => {
    return supabase
      .from('user_items')
      .select('*, items(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setAllItems(data || []))
  }, [session.user.id])

  // Contagem das estantes de livros = itens que aparecem nas coleções
  // (não o total histórico em user_items, que pode incluir itens já
  // removidos das coleções)
  const loadShelfCounts = useCallback(() => {
    return supabase
      .from('collections')
      .select('category, collection_items(id)')
      .eq('user_id', session.user.id)
      .then(({ data }) => {
        const counts = { reading: 0, want_to_read: 0, read: 0 }
        ;(data || []).forEach(col => {
          if (col.category in counts) counts[col.category] += (col.collection_items || []).length
        })
        setShelfCounts(counts)
      })
  }, [session.user.id])

  // Carrega itens + mantém contagem das estantes em tempo real:
  // refetch ao focar a aba/janela e via realtime subscription em user_items/collections/collection_items
  useEffect(() => {
    loadAllItems()
    loadShelfCounts()

    function onVisible() {
      if (document.visibilityState === 'visible') {
        loadAllItems()
        loadShelfCounts()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', loadAllItems)
    window.addEventListener('focus', loadShelfCounts)

    const channel = supabase
      .channel(`user_items_${session.user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'user_items',
        filter: `user_id=eq.${session.user.id}`,
      }, loadAllItems)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'collections',
        filter: `user_id=eq.${session.user.id}`,
      }, loadShelfCounts)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'collection_items',
      }, loadShelfCounts)
      .subscribe()

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', loadAllItems)
      window.removeEventListener('focus', loadShelfCounts)
      supabase.removeChannel(channel)
    }
  }, [session.user.id, loadAllItems, loadShelfCounts])

  const themeClass = theme === 'L' ? 'light' : 'dark'
  const initial = (profile?.full_name || profile?.username || session.user.email || '?')[0].toUpperCase()

  const bookItems  = allItems.filter(ui => ui.items?.type === 'book')
  const movieItems = allItems.filter(ui => ui.items?.type === 'movie')

  const watching    = movieItems.filter(ui => ui.status === 'watching')
  const wantToWatch = movieItems.filter(ui => ui.status === 'want_to_watch')
  const watched     = movieItems.filter(ui => ui.status === 'watched')

  function goToItem(item, userItem, origin) {
    onNavigate('item', { item, userItem, isOwner: true, origin })
  }

  function goToSearch(fromStatus) {
    onNavigate('search', fromStatus ? { fromStatus } : null)
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <NotificationBell session={session} />
            <div
              className="av"
              style={profile?.avatar_url ? { padding: 0, overflow: 'hidden' } : {}}
              onClick={() => onNavigate('profile')}
            >
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initial}
            </div>
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
          <ShelvesSection
            counts={shelfCounts}
            bookItems={bookItems}
            userId={session.user.id}
            onItemClick={goToItem}
            onNavigate={onNavigate}
            reopen={reopen}
            onReopenConsumed={onReopenConsumed}
          />
          <LibrarySection tipo="L" userLibrary={allItems} onItemClick={goToItem} />
        </div>

        {/* Filmes */}
        <div className="sc" style={{ display: activeTab === 'F' ? undefined : 'none' }}>
          <StatusSection label="Assistindo" badgeClass="BL" dotClass="DL" userItems={watching}    onItemClick={goToItem} onAddClick={() => goToSearch('watching')} />
          <StatusSection label="Quero Ver"  badgeClass="BQ" dotClass="DQ" userItems={wantToWatch} onItemClick={goToItem} onAddClick={() => goToSearch('want_to_watch')} />
          <StatusSection label="Assistidos" badgeClass="BD" dotClass="DD" userItems={watched}     onItemClick={goToItem} onAddClick={() => goToSearch('watched')} />
          <LibrarySection tipo="F" userLibrary={allItems} onItemClick={goToItem} onManualAdd={() => onNavigate('s10')} />
        </div>

        {/* Bottom navigation */}
        <div className="bnav">
          <div className="ni on">
            <span className="nic">📚</span>
            <span className="nla">Biblioteca</span>
          </div>
          <div className="ni" onClick={() => onNavigate('community')}>
            <span className="nic">👥</span>
            <span className="nla">Comunidade</span>
          </div>
          <div className="ni" onClick={() => goToSearch()}>
            <span className="nic">🔍</span>
            <span className="nla">Buscar</span>
          </div>
          <div className="ni" onClick={() => onNavigate('profile')}>
            <span className="nic">👤</span>
            <span className="nla">Perfil</span>
          </div>
        </div>

      </div>
    </div>
  )
}
