import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function ReadingProgress({ session, itemId }) {
  const [totalPages,  setTotalPages]  = useState('')
  const [currentPage, setCurrentPage] = useState('')
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef(null)

  useEffect(() => {
    if (!itemId) return
    supabase
      .from('reading_progress')
      .select('total_pages, current_page')
      .eq('user_id', session.user.id)
      .eq('item_id', itemId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTotalPages(data.total_pages != null ? String(data.total_pages) : '')
          setCurrentPage(data.current_page != null ? String(data.current_page) : '')
        }
        setLoaded(true)
      })
  }, [itemId, session.user.id])

  useEffect(() => {
    if (!loaded) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      supabase.from('reading_progress').upsert({
        user_id:      session.user.id,
        item_id:      itemId,
        total_pages:  totalPages  ? Number(totalPages)  : null,
        current_page: currentPage ? Number(currentPage) : null,
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'user_id,item_id' }).then()
    }, 800)
    return () => clearTimeout(saveTimer.current)
  }, [totalPages, currentPage, loaded, itemId, session.user.id])

  const total   = Number(totalPages)  || 0
  const current = Number(currentPage) || 0
  const pct = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0

  return (
    <div className="rprog">
      <div className="bl">Progresso de leitura</div>
      <div className="rprog-inputs">
        <div className="rprog-field">
          <label>Página atual</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={currentPage}
            onChange={e => setCurrentPage(e.target.value)}
          />
        </div>
        <div className="rprog-field">
          <label>Total de páginas</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={totalPages}
            onChange={e => setTotalPages(e.target.value)}
          />
        </div>
      </div>
      <div className="rprog-bar">
        <div className="rprog-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="rprog-text">
        {total > 0
          ? `Você já leu ${current} de ${total} páginas`
          : 'Informe o total de páginas para acompanhar seu progresso'}
      </div>
    </div>
  )
}
