import { useState, useEffect, useRef } from 'react'
import { useNotifications } from '../hooks/useNotifications'
import { formatCommentDate } from '../utils/formatDate'

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function ActorAvatar({ profile }) {
  const [err, setErr] = useState(false)
  const name = profile?.username || '?'
  const initial = name.charAt(0).toUpperCase()

  if (profile?.avatar_url && !err) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        onError={() => setErr(true)}
        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: '#C4A8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{initial}</span>
    </div>
  )
}

export default function NotificationBell({ session }) {
  const { notifications, unreadCount, markAllAsRead, loading } = useNotifications(session?.user?.id)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function toggle() {
    setOpen(o => {
      const next = !o
      if (next) markAllAsRead()
      return next
    })
  }

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div
        className="av"
        style={{ background: 'var(--sur)', border: '1px solid var(--bor2)', boxShadow: 'none' }}
        onClick={toggle}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 18, height: 18, borderRadius: 9, padding: '0 4px',
            background: '#CCA33D', color: '#1A1720',
            fontSize: 10, fontWeight: 800, lineHeight: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {badgeLabel}
          </span>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50,
          width: 320, maxHeight: 400, overflowY: 'auto',
          background: '#211E2B', borderRadius: 12,
          border: '1px solid var(--bor)', boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
        }}>
          <div style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
            Notificações
          </div>

          {loading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><BellIcon /></div>
              <div style={{ fontSize: 12 }}>Nenhuma notificação ainda</div>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                style={{
                  display: 'flex', gap: 10, padding: '12px 14px',
                  background: n.read ? 'transparent' : 'rgba(196,168,240,0.08)',
                  borderTop: '1px solid var(--bor)',
                }}
              >
                <ActorAvatar profile={n.profiles} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text)' }}>{n.profiles?.username || 'Alguém'}</strong>
                    {' comentou no seu item '}
                    <strong style={{ color: 'var(--text)' }}>{n.items?.title || 'item'}</strong>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{formatCommentDate(n.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
