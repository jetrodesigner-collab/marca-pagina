import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const MAX_OPTIONS = [5, 10, 20, 50]

export default function ModalCriarClube({ userId, onClose, onCreate }) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [privacidade, setPrivacidade] = useState('privado')
  const [maxMembros, setMaxMembros] = useState(20)
  const [userBooks, setUserBooks] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    loadBooks()
  }, [])

  async function loadBooks() {
    setLoading(true)
    const { data } = await supabase
      .from('user_items')
      .select('id, items (id, title, author, cover_url, api_id, type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setUserBooks((data || []).filter(ui => ui.items?.type === 'book').map(ui => ui.items))
    setLoading(false)
  }

  async function handleCreate() {
    if (!nome.trim()) { setErr('Dê um nome ao clube.'); return }
    setSaving(true)
    setErr('')
    try {
      const club = await onCreate({
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        livro: selectedBook ? {
          titulo: selectedBook.title,
          autor: selectedBook.author,
          capa: selectedBook.cover_url,
          id: selectedBook.api_id,
        } : null,
        privacidade,
        max_membros: maxMembros,
      })
      onClose(club)
    } catch (e) {
      setErr(e.message || 'Erro ao criar clube.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose(null)}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Criar clube</div>

        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
          Nome do clube *
        </label>
        <input
          className="finp"
          placeholder="Ex: Os Leitores de Elite"
          value={nome}
          onChange={e => setNome(e.target.value)}
          style={{ marginBottom: 14 }}
        />

        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
          Descrição (opcional)
        </label>
        <textarea
          className="finp"
          placeholder="Sobre o clube..."
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          rows={2}
          style={{ resize: 'none', marginBottom: 14 }}
        />

        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
          Livro da leitura
        </label>
        {loading ? (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Carregando sua biblioteca...</div>
        ) : userBooks.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Nenhum livro na sua biblioteca.</div>
        ) : (
          <div style={{ maxHeight: 140, overflowY: 'auto', marginBottom: 14, borderRadius: 10, border: '1px solid var(--bor)', background: 'var(--sur)' }}>
            <div
              onClick={() => setSelectedBook(null)}
              style={{
                padding: '10px 14px',
                fontSize: 12,
                color: selectedBook === null ? 'var(--accent)' : 'var(--muted)',
                fontWeight: selectedBook === null ? 700 : 400,
                cursor: 'pointer',
                borderBottom: '1px solid var(--bor)',
              }}
            >
              Sem livro
            </div>
            {userBooks.map(b => (
              <div
                key={b.id}
                onClick={() => setSelectedBook(b)}
                style={{
                  padding: '10px 14px',
                  fontSize: 12,
                  color: selectedBook?.id === b.id ? 'var(--accent)' : 'var(--text)',
                  fontWeight: selectedBook?.id === b.id ? 700 : 400,
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--bor)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {b.title}{b.author ? ` · ${b.author}` : ''}
              </div>
            ))}
          </div>
        )}

        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Privacidade
        </label>
        <div className="priv" style={{ marginBottom: 14 }}>
          <button className={`pb${privacidade === 'publico' ? ' on' : ''}`} onClick={() => setPrivacidade('publico')}>
            🌍 Público
          </button>
          <button className={`pb${privacidade === 'privado' ? ' on' : ''}`} onClick={() => setPrivacidade('privado')}>
            🔒 Privado
          </button>
        </div>

        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Limite de membros
        </label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {MAX_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => setMaxMembros(n)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 12,
                border: `1px solid ${maxMembros === n ? 'rgba(196,168,240,.45)' : 'var(--bor2)'}`,
                background: maxMembros === n ? 'rgba(196,184,232,.15)' : 'var(--sur)',
                color: maxMembros === n ? 'var(--accent)' : 'var(--muted)',
                fontFamily: 'Figtree, sans-serif',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {err && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="post-cancel-btn" onClick={() => onClose(null)} disabled={saving}>
            Cancelar
          </button>
          <button className="post-publish-btn" onClick={handleCreate} disabled={saving}>
            {saving ? 'Criando...' : 'Criar clube'}
          </button>
        </div>
      </div>
    </div>
  )
}
