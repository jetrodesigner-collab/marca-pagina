import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

const COVER_COLORS = ['c1','c2','c3','c4','c5','c6','c7','c8','c9']

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function Cover({ item }) {
  const [imgErr, setImgErr] = useState(false)
  const initials = item.title.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const cls = COVER_COLORS[item.title.charCodeAt(0) % COVER_COLORS.length]

  if (item.cover_url && !imgErr) {
    return (
      <img
        src={item.cover_url}
        alt=""
        onError={() => setImgErr(true)}
        style={{ width: 46, height: 64, borderRadius: 8, objectFit: 'cover', flexShrink: 0, boxShadow: '0 3px 10px rgba(0,0,0,.2)' }}
      />
    )
  }
  return (
    <div className={cls} style={{
      width: 46, height: 64, borderRadius: 8, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 3px 10px rgba(0,0,0,.2)',
    }}>
      <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 12 }}>{initials}</span>
    </div>
  )
}

function ItemRow({ item, username, children }) {
  return (
    <div className="tcrd" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <Cover item={item} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
        {item.author && (
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.author}
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
          Enviado por @{username || 'desconhecido'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
          {formatDate(item.created_at)}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ onClick, danger, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 12px', borderRadius: 12,
        border: danger ? '1px solid rgba(192,80,80,.35)' : '1px solid rgba(196,168,240,0.35)',
        background: danger ? 'rgba(192,80,80,.12)' : 'rgba(196,168,240,0.1)',
        color: danger ? 'var(--red)' : 'var(--accent)',
        fontFamily: "'Figtree', sans-serif", fontSize: 11, fontWeight: 700,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0 24px', color: 'var(--muted)' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 12, lineHeight: 1.55 }}>{text}</div>
    </div>
  )
}

export default function AdminPanel({ session, onNavigate }) {
  const [theme] = useState(() => localStorage.getItem('tema') || 'D')
  const themeClass = theme === 'L' ? 'light' : 'dark'

  const [checking, setChecking] = useState(true)
  const [isAdmin,  setIsAdmin]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [pending,  setPending]  = useState([])
  const [approved, setApproved] = useState([])
  const [rejected, setRejected] = useState([])
  const [usernames, setUsernames] = useState({})
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          onNavigate('library')
          return
        }
        setIsAdmin(true)
        setChecking(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: p }, { data: a }, { data: r }] = await Promise.all([
      supabase.from('items').select('*').eq('is_manual', true).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('items').select('*').eq('is_manual', true).eq('status', 'approved').order('created_at', { ascending: false }),
      supabase.from('items').select('*').eq('is_manual', true).eq('status', 'rejected').order('created_at', { ascending: false }),
    ])
    setPending(p || [])
    setApproved(a || [])
    setRejected(r || [])

    const ids = [...new Set([...(p || []), ...(a || []), ...(r || [])].map(i => i.created_by).filter(Boolean))]
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', ids)
      const map = {}
      ;(profiles || []).forEach(pr => { map[pr.id] = pr.username })
      setUsernames(map)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (isAdmin) loadAll()
  }, [isAdmin])

  async function approveItem(item) {
    const { error } = await supabase.from('items').update({ status: 'approved' }).eq('id', item.id)
    if (!error) {
      setToast('Livro aprovado')
      loadAll()
    } else {
      setToast('Erro ao aprovar livro')
    }
  }

  async function rejectItem(item) {
    const { error } = await supabase.from('items').update({ status: 'rejected' }).eq('id', item.id)
    if (!error) {
      setToast('Livro rejeitado')
      loadAll()
    } else {
      setToast('Erro ao rejeitar livro')
    }
  }

  async function confirmDeleteItem() {
    if (!confirmDelete || deleting) return
    setDeleting(true)
    const { error } = await supabase.from('items').delete().eq('id', confirmDelete.id)
    setDeleting(false)
    setConfirmDelete(null)
    if (!error) {
      setToast('Livro excluído')
      loadAll()
    } else {
      setToast('Erro ao excluir livro')
    }
  }

  if (checking) return null

  return (
    <div
      className={themeClass}
      style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
    >
      {BLOBS.map((b, i) => (
        <div key={i} style={{ position: 'fixed', borderRadius: '50%', filter: 'blur(55px)', pointerEvents: 'none', zIndex: 0, ...b }} />
      ))}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <div className="ph">
          <div className="bk" onClick={() => onNavigate('profile')}>←</div>
          <div className="ph-t">Painel Admin</div>
        </div>

        <div className="gl" />

        <div className="sc">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <div className="spin" />
            </div>
          ) : (
            <>
              <div className="sec-t">Pendentes de aprovação</div>
              {pending.length === 0 ? (
                <EmptyState icon="✅" text="Nenhum livro aguardando aprovação" />
              ) : (
                pending.map(item => (
                  <ItemRow key={item.id} item={item} username={usernames[item.created_by]}>
                    <ActionBtn onClick={() => approveItem(item)}>✅ Aprovar</ActionBtn>
                    <ActionBtn onClick={() => rejectItem(item)} danger>❌ Rejeitar</ActionBtn>
                  </ItemRow>
                ))
              )}

              <div className="sec-t" style={{ marginTop: 22 }}>Manuais aprovados</div>
              {approved.length === 0 ? (
                <EmptyState icon="📚" text="Nenhum livro manual aprovado ainda" />
              ) : (
                approved.map(item => (
                  <ItemRow key={item.id} item={item} username={usernames[item.created_by]}>
                    <ActionBtn onClick={() => setConfirmDelete(item)} danger>🗑 Deletar</ActionBtn>
                  </ItemRow>
                ))
              )}

              <div className="sec-t" style={{ marginTop: 22 }}>Rejeitados</div>
              {rejected.length === 0 ? (
                <EmptyState icon="🗂" text="Nenhum livro rejeitado" />
              ) : (
                rejected.map(item => (
                  <ItemRow key={item.id} item={item} username={usernames[item.created_by]}>
                    <ActionBtn onClick={() => setConfirmDelete(item)} danger>🗑 Deletar definitivamente</ActionBtn>
                  </ItemRow>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            padding: '0 20px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}
        >
          <div style={{
            width: '100%', maxWidth: 360,
            background: 'var(--bg)', backgroundImage: 'var(--bg)',
            border: '1px solid var(--bor)',
            borderRadius: 22, padding: '24px 20px',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', textAlign: 'center', marginBottom: 8 }}>
              Excluir "{confirmDelete.title}"?
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.55, marginBottom: 22 }}>
              Esse livro e todas as anotações relacionadas serão excluídos permanentemente.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 14,
                  border: '1px solid var(--bor2)', background: 'var(--sur)',
                  color: 'var(--text)', fontFamily: "'Figtree', sans-serif",
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteItem}
                disabled={deleting}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 14,
                  border: 'none', background: '#E57373',
                  color: '#fff', fontFamily: "'Figtree', sans-serif",
                  fontSize: 13, fontWeight: 700, cursor: deleting ? 'default' : 'pointer',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
