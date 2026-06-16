import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useClubMembers } from '../hooks/useClubMembers'
import ClubFeed from '../components/clubs/ClubFeed'
import ClubProgresso from '../components/clubs/ClubProgresso'
import ClubTrechos from '../components/clubs/ClubTrechos'
import ClubAlmanaque from '../components/clubs/ClubAlmanaque'
import BadgePopup from '../components/clubs/BadgePopup'
import ModalConvidar from '../components/clubs/ModalConvidar'

const TABS = ['Feed', 'Progresso', 'Trechos', 'Almanaque']

export default function ClubeDetalhe({ session, club: initialClub, onBack, onNavigate }) {
  const [activeTab, setActiveTab] = useState(0)
  const [club, setClub] = useState(initialClub)
  const [profile, setProfile] = useState(null)
  const [pendingBadge, setPendingBadge] = useState(null)
  const [showConvidar, setShowConvidar] = useState(false)
  const [toast, setToast] = useState(null)

  const { members, activeMeta, loading: membersLoading, refresh: refreshMembers } = useClubMembers(club.id)

  const isAdmin = club.role === 'admin'
  const daysLeft = activeMeta?.data_limite
    ? Math.max(0, Math.ceil((new Date(activeMeta.data_limite) - new Date()) / (1000 * 60 * 60 * 24)))
    : null

  useEffect(() => {
    supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [session.user.id])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function handleBadgeUnlock(badge) {
    setPendingBadge(badge)
    refreshMembers()
  }

  const postCount = members.reduce((s, m) => s + (m.postCount || 0), 0)
  const trechoCount = members.reduce((s, m) => s + (m.trechoCount || 0), 0)

  return (
    <div className="dark" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* Banner */}
      <div className="cl-banner">
        <div className="cl-banner-bg" />
        {club.livro_capa && (
          <img
            src={club.livro_capa}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: .12, filter: 'blur(8px)', transform: 'scale(1.1)' }}
          />
        )}
        <button className="cl-back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="10 4 6 8 10 12"/>
          </svg>
        </button>
        {isAdmin && (
          <button className="cl-settings" onClick={() => setShowConvidar(true)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 3a3 3 0 110 6M5 3a3 3 0 110 6M1 13c0-2.2 1.8-4 4-4h4c2.2 0 4 1.8 4 4M13 9c1.1 0 2 .9 2 2v2"/>
            </svg>
          </button>
        )}
        <div className="cl-banner-content">
          <div className="cl-banner-cover" style={{ background: 'rgba(196,168,240,.1)' }}>
            {club.livro_capa
              ? <img src={club.livro_capa} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span>📚</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 3 }}>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, marginBottom: 2 }}>{club.nome}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {club.livro_titulo
                ? `${club.livro_titulo}${club.livro_autor ? ' · ' + club.livro_autor : ''}`
                : 'Sem livro selecionado'}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'rgba(240,235,248,.62)' }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="8" cy="6" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>
                {members.length} membros
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'rgba(240,235,248,.62)' }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H2a1 1 0 00-1 1v9a1 1 0 001 1h3l3 3 3-3h3a1 1 0 001-1V3a1 1 0 00-1-1z"/></svg>
                {postCount} posts
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'rgba(240,235,248,.62)' }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 4h12M2 8h8M2 12h5"/></svg>
                {trechoCount} trechos
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Meta strip */}
      {activeMeta && (
        <div className="cl-meta-strip">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(196,168,240,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><polyline points="8 5 8 8 10 10"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>🎯 {activeMeta.titulo}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Meta em andamento</div>
            </div>
          </div>
          {daysLeft !== null && (
            <div style={{ fontSize: 11, fontWeight: 600, color: '#F0C97A', background: 'rgba(240,201,122,.13)', borderRadius: 8, padding: '3px 8px' }}>
              ⏳ {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
            </div>
          )}
        </div>
      )}

      {/* Abas */}
      <div className="cl-inner-tabs">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            className={`cl-inner-tab${activeTab === i ? ' on' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {activeTab === 0 && (
          <ClubFeed
            club={club}
            activeMeta={activeMeta}
            members={members}
            currentUserId={session.user.id}
            onBadgeUnlock={handleBadgeUnlock}
            onToast={showToast}
            profile={profile}
          />
        )}
        {activeTab === 1 && (
          <ClubProgresso
            members={members}
            activeMeta={activeMeta}
            clubId={club.id}
            currentUserId={session.user.id}
            onBadgeClick={b => setPendingBadge(b)}
            onToast={showToast}
          />
        )}
        {activeTab === 2 && (
          <ClubTrechos
            clubId={club.id}
            currentUserId={session.user.id}
          />
        )}
        {activeTab === 3 && (
          <ClubAlmanaque club={club} clubId={club.id} />
        )}
      </div>

      {/* Bottom nav */}
      <div className="bnav">
        <div className="ni" onClick={() => onNavigate('library')}>
          <span className="nic">📚</span>
          <span className="nla">Biblioteca</span>
        </div>
        <div className="ni" onClick={() => onNavigate('community')}>
          <span className="nic">👥</span>
          <span className="nla">Comunidade</span>
        </div>
        <div className="ni on">
          <span className="ni-svg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </span>
          <span className="nla">Clubes</span>
        </div>
        <div className="ni" onClick={() => onNavigate('search')}>
          <span className="nic">🔍</span>
          <span className="nla">Buscar</span>
        </div>
        <div className="ni" onClick={() => onNavigate('profile')}>
          <span className="nic">👤</span>
          <span className="nla">Perfil</span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast">{toast}</div>
      )}

      {/* Badge popup */}
      {pendingBadge && (
        <BadgePopup
          badge={pendingBadge}
          onClose={() => setPendingBadge(null)}
        />
      )}

      {/* Modal convidar */}
      {showConvidar && (
        <ModalConvidar
          club={club}
          onClose={() => setShowConvidar(false)}
        />
      )}
    </div>
  )
}
