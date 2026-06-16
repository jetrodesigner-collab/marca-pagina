import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const TAGS = {
  'História':  { bg: 'rgba(196,168,240,.14)', color: 'var(--accent)' },
  'Cinema':    { bg: 'rgba(126,223,168,.1)',   color: '#7EDFA8' },
  'Histórico': { bg: 'rgba(126,223,168,.1)',   color: '#7EDFA8' },
  'Curiosidade': { bg: 'rgba(240,201,122,.13)', color: '#F0C97A' },
}

export default function ClubAlmanaque({ club, clubId }) {
  const [bookData, setBookData] = useState(null)
  const [oldMetas, setOldMetas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [clubId])

  async function load() {
    setLoading(true)

    const metasReq = supabase
      .from('club_metas')
      .select('titulo, criado_em')
      .eq('club_id', clubId)
      .eq('ativa', false)
      .order('criado_em', { ascending: false })

    let bookReq = null
    if (club.livro_id) {
      bookReq = fetch(
        `https://openlibrary.org${club.livro_id}.json`
      ).then(r => r.json()).catch(() => null)
    }

    const [{ data: metas }, bookJson] = await Promise.all([metasReq, bookReq || Promise.resolve(null)])
    setOldMetas(metas || [])

    if (bookJson) {
      setBookData({
        sinopse: typeof bookJson.description === 'string'
          ? bookJson.description
          : bookJson.description?.value || '',
        paginas: bookJson.number_of_pages || bookJson.pagination || null,
      })
    }

    setLoading(false)
  }

  return (
    <div style={{ padding: '28px 22px 120px' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
        Contexto histórico, curiosidades e notas sobre{' '}
        <em style={{ color: 'rgba(240,235,248,.62)' }}>{club.livro_titulo || 'este livro'}</em>.
      </div>

      {/* Info do livro via Open Library */}
      {club.livro_titulo && (
        <div className="cl-alma-card">
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 9 }}>
            📚 Sobre o livro
          </div>
          <div style={{ fontSize: 12, color: 'rgba(240,235,248,.62)', lineHeight: 1.58 }}>
            {loading ? 'Carregando informações...' : (
              bookData?.sinopse
                ? bookData.sinopse.slice(0, 400) + (bookData.sinopse.length > 400 ? '...' : '')
                : `"${club.livro_titulo}"${club.livro_autor ? ` de ${club.livro_autor}` : ''}.`
            )}
          </div>
          {bookData?.paginas && (
            <span style={{ display: 'inline-block', marginTop: 7, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: 'rgba(196,168,240,.14)', color: 'var(--accent)' }}>
              {bookData.paginas} páginas
            </span>
          )}
        </div>
      )}

      {club.livro_autor && (
        <div className="cl-alma-card">
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 9 }}>
            ✍️ Autor
          </div>
          <div style={{ fontSize: 12, color: 'rgba(240,235,248,.62)', lineHeight: 1.58 }}>
            {club.livro_autor}
          </div>
          <span style={{ display: 'inline-block', marginTop: 7, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,223,168,.1)', color: '#7EDFA8' }}>
            Autor
          </span>
        </div>
      )}

      {/* Histórico de metas */}
      {oldMetas.length > 0 && (
        <div className="cl-alma-card">
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 9 }}>📌 Metas anteriores</div>
          <div style={{ fontSize: 12, color: 'rgba(240,235,248,.62)', lineHeight: 1.68 }}>
            {oldMetas.map((m, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                {m.titulo}
              </div>
            ))}
          </div>
          <span style={{ display: 'inline-block', marginTop: 7, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,223,168,.1)', color: '#7EDFA8' }}>
            Histórico
          </span>
        </div>
      )}

      {!club.livro_titulo && !loading && (
        <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--muted)' }}>
          Nenhum livro selecionado para o clube.
        </div>
      )}
    </div>
  )
}
