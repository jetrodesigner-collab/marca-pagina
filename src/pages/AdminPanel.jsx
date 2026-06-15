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

function ReportRow({ report, reportedUsername, reporterUsername, children }) {
  return (
    <div className="tcrd">
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
        Denunciado: @{reportedUsername || 'desconhecido'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
        Por @{reporterUsername || 'desconhecido'} · {formatDate(report.created_at)}
      </div>
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 4,
        color: report.status === 'pendente' ? 'var(--accent)' : 'var(--muted)',
      }}>
        {report.status}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {children}
      </div>
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
  const [reports,  setReports]  = useState([])
  const [usernames, setUsernames] = useState({})
  const [toast, setToast] = useState(null)
  const [confirmReportAccount, setConfirmReportAccount] = useState(null)
  const [processingReport, setProcessingReport] = useState(false)

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
    const [{ data: p }, { data: rep }] = await Promise.all([
      supabase.from('items').select('*').eq('is_manual', true).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
    ])
    setPending(p || [])
    setReports(rep || [])

    const itemIds = (p || []).map(i => i.created_by).filter(Boolean)
    const reportIds = (rep || []).flatMap(x => [x.reporter_id, x.reported_id])
    const ids = [...new Set([...itemIds, ...reportIds])]
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
    setPending(prev => prev.filter(i => i.id !== item.id))
    const { error } = await supabase.from('items').update({ status: 'approved' }).eq('id', item.id)
    if (!error) {
      setToast('Livro aprovado')
    } else {
      setToast('Erro ao aprovar livro')
      loadAll()
    }
  }

  async function rejectItem(item) {
    setPending(prev => prev.filter(i => i.id !== item.id))
    const { error } = await supabase.from('items').update({ status: 'rejected' }).eq('id', item.id)
    if (!error) {
      setToast('Livro rejeitado')
    } else {
      setToast('Erro ao rejeitar livro')
      loadAll()
    }
  }

  async function deleteReportedPosts(report) {
    const { error } = await supabase.from('posts').delete().eq('user_id', report.reported_id)
    if (!error) {
      setToast('Posts excluídos')
      loadAll()
    } else {
      setToast('Erro ao excluir posts')
    }
  }

  async function deleteReportedComments(report) {
    const { error } = await supabase.from('comments').delete().eq('user_id', report.reported_id)
    if (!error) {
      setToast('Comentários excluídos')
      loadAll()
    } else {
      setToast('Erro ao excluir comentários')
    }
  }

  async function ignoreReport(report) {
    const { error } = await supabase.from('reports').update({ status: 'resolvida' }).eq('id', report.id)
    if (!error) {
      setToast('Denúncia marcada como resolvida')
      loadAll()
    } else {
      setToast('Erro ao atualizar denúncia')
    }
  }

  async function confirmDeleteAccount() {
    if (!confirmReportAccount || processingReport) return
    setProcessingReport(true)
    const { error } = await supabase.rpc('admin_delete_account', { target_id: confirmReportAccount.reported_id })
    setProcessingReport(false)
    setConfirmReportAccount(null)
    if (!error) {
      setToast('Conta excluída')
      loadAll()
    } else {
      setToast('Erro ao excluir conta')
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

              <div className="sec-t" style={{ marginTop: 22 }}>Denúncias</div>
              {reports.length === 0 ? (
                <EmptyState icon="🛡️" text="Nenhuma denúncia registrada" />
              ) : (
                reports.map(r => (
                  <ReportRow key={r.id} report={r} reportedUsername={usernames[r.reported_id]} reporterUsername={usernames[r.reporter_id]}>
                    <ActionBtn onClick={() => onNavigate('publicProfile', { userId: r.reported_id })}>👁 Ver perfil</ActionBtn>
                    <ActionBtn onClick={() => deleteReportedPosts(r)} danger>🗑 Excluir posts</ActionBtn>
                    <ActionBtn onClick={() => deleteReportedComments(r)} danger>🗑 Excluir comentários</ActionBtn>
                    <ActionBtn onClick={() => setConfirmReportAccount(r)} danger>⛔ Excluir conta</ActionBtn>
                    {r.status === 'pendente' && (
                      <ActionBtn onClick={() => ignoreReport(r)}>✓ Ignorar denúncia</ActionBtn>
                    )}
                  </ReportRow>
                ))
              )}
            </>
          )}
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
          <div className="ni on" onClick={() => onNavigate('profile')}>
            <span className="nic">👤</span>
            <span className="nla">Perfil</span>
          </div>
        </div>
      </div>

      {confirmReportAccount && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            padding: '0 20px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmReportAccount(null) }}
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
              Excluir conta de @{usernames[confirmReportAccount.reported_id] || 'usuário'}?
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.55, marginBottom: 22 }}>
              Esta conta e todos os seus dados (posts, comentários, resenhas, biblioteca) serão excluídos permanentemente.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmReportAccount(null)}
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
                onClick={confirmDeleteAccount}
                disabled={processingReport}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 14,
                  border: 'none', background: '#E57373',
                  color: '#fff', fontFamily: "'Figtree', sans-serif",
                  fontSize: 13, fontWeight: 700, cursor: processingReport ? 'default' : 'pointer',
                  opacity: processingReport ? 0.7 : 1,
                }}
              >
                {processingReport ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
