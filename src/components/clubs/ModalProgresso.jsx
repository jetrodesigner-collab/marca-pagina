import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ModalProgresso({ paginaAtual, paginaFim, userId, clubId, onClose }) {
  const [pagina, setPagina] = useState(paginaAtual ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const pg = parseInt(pagina) || 0
  const pct = paginaFim && pg ? Math.min(100, Math.round((pg / paginaFim) * 100)) : null

  async function save() {
    if (!pg || pg < 0) return
    setSaving(true)
    setSaveError(null)
    try {
      const { error } = await supabase
        .from('club_members')
        .update({ pagina_atual: pg })
        .eq('club_id', clubId)
        .eq('user_id', userId)
      if (error) throw error
      onClose(pg)
    } catch {
      setSaveError('Erro ao salvar. Verifique sua conexão ou execute o SQL de correção.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose(null)}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
          Meu progresso
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
          Atualize sua página para que o grupo veja seu progresso.
        </div>

        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
          Em qual página você está?
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <input
            type="number"
            className="finp"
            placeholder="Ex: 185"
            value={pagina}
            onChange={e => setPagina(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            min={0}
            max={paginaFim || 9999}
            autoFocus
            style={{ marginBottom: 0, flex: 1 }}
          />
          {paginaFim && (
            <span style={{ color: 'var(--muted)', fontSize: 14, flexShrink: 0 }}>
              / {paginaFim}
            </span>
          )}
        </div>

        {pct !== null && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ height: 4, background: 'rgba(255,255,255,.07)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: 'linear-gradient(90deg,var(--accent),#9B7BD4)', transition: 'width .3s' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{pct}% concluído</div>
          </div>
        )}

        {saveError && (
          <div style={{ fontSize: 11, color: '#F07A7A', marginBottom: 12, lineHeight: 1.4 }}>
            {saveError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="post-cancel-btn" onClick={() => onClose(null)} disabled={saving}>
            Cancelar
          </button>
          <button className="post-publish-btn" onClick={save} disabled={saving || !pagina}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
