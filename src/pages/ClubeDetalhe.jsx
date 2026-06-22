import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useClubMembers } from '../hooks/useClubMembers'
import ClubFeed from '../components/clubs/ClubFeed'
import ClubProgresso from '../components/clubs/ClubProgresso'
import ClubTrechos from '../components/clubs/ClubTrechos'
import ClubAlmanaque from '../components/clubs/ClubAlmanaque'
import ClubGerenciar from '../components/clubs/ClubGerenciar'
import ClubPalpites from '../components/clubs/ClubPalpites'
import ClubApostas from '../components/clubs/ClubApostas'
import ClubCriarAvaliacao from '../components/clubs/ClubCriarAvaliacao'
import ClubAvaliacaoTela from '../components/clubs/ClubAvaliacaoTela'
import { useClubActivity } from '../hooks/useClubActivity'
import BadgePopup from '../components/clubs/BadgePopup'
import ModalConvidar from '../components/clubs/ModalConvidar'
import ModalProgresso from '../components/clubs/ModalProgresso'

const BASE_TABS = ['Feed', 'Progresso', 'Trechos', 'Almanaque']

export default function ClubeDetalhe({ session, club: initialClub, onBack, onNavigate }) {
  const [activeTab, setActiveTab] = useState(0)
  const [subScreen, setSubScreen] = useState(null) // 'palpites' | 'apostas' | 'avaliacao' | 'criar-avaliacao' | null
  const [club, setClub] = useState(initialClub)
  const [profile, setProfile] = useState(null)
  const [pendingBadge, setPendingBadge] = useState(null)
  const [showConvidar, setShowConvidar] = useState(false)
  const [showModalProgresso, setShowModalProgresso] = useState(false)
  const [toast, setToast] = useState(null)

  const { members, activeMeta, loading: membersLoading, refresh: refreshMembers, setActiveMeta: setMetaImmediate } = useClubMembers(club.id)
  const {
    activity, answers: activityAnswers, grades: activityGrades,
    myAnswers: myActivityAnswers, myGrade: myActivityGrade,
    loading: loadingActivity,
    createActivity, submitAnswers, deleteMyAnswers, saveGrade, deleteActivity, updateStatus: updateActivityStatus,
    refresh: refreshActivity,
  } = useClubActivity(club.id, session.user.id)

  const isAdmin = club.role === 'admin' || club.criador_id === session.user.id
  const TABS = isAdmin ? [...BASE_TABS, '⚙️'] : BASE_TABS

  const daysLeft = activeMeta?.data_limite
    ? Math.max(0, Math.ceil((new Date(activeMeta.data_limite) - new Date()) / (1000 * 60 * 60 * 24)))
    : null

  const coverSrc = club.foto_url || club.livro_capa || null

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

  function handleGerenciarUpdate({ clubData, newMeta } = {}) {
    if (clubData) setClub(c => ({ ...c, ...clubData }))
    if (newMeta) setMetaImmediate(newMeta)
    refreshMembers()
  }

  const postCount = members.reduce((s, m) => s + (m.postCount || 0), 0)
  const trechoCount = members.reduce((s, m) => s + (m.trechoCount || 0), 0)

  return (
    <div className="dark" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* Banner */}
      <div className="cl-banner">
        <div className="cl-banner-bg" />
        {coverSrc && (
          <img
            src={coverSrc}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: .12, filter: 'blur(8px)', transform: 'scale(1.1)' }}
          />
        )}
        <button className="cl-back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="10 4 6 8 10 12"/>
          </svg>
        </button>
        <button
          className="cl-settings"
          onClick={() => isAdmin ? setActiveTab(TABS.length - 1) : setShowModalProgresso(true)}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="2.5"/>
            <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"/>
          </svg>
        </button>
        <div className="cl-banner-content">
          <div className="cl-banner-cover" style={{ background: coverSrc ? 'transparent' : 'rgba(196,168,240,.1)' }}>
            {coverSrc
              ? <img src={coverSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span>📚</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 3 }}>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, marginBottom: 2, color: 'var(--text)' }}>{club.nome}</div>
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
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>🎯 {activeMeta.titulo}</div>
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
            isAdmin={isAdmin}
            onBadgeUnlock={handleBadgeUnlock}
            onToast={showToast}
            profile={profile}
            onViewPalpites={() => setSubScreen('palpites')}
            onViewApostas={() => setSubScreen('apostas')}
            activity={activity}
            loadingActivity={loadingActivity}
            onViewAvaliacao={() => setSubScreen('avaliacao')}
            onCriarAvaliacao={() => setSubScreen('criar-avaliacao')}
          />
        )}
        {activeTab === 1 && (
          <ClubProgresso
            members={members}
            activeMeta={activeMeta}
            clubId={club.id}
            currentUserId={session.user.id}
            profile={profile}
            clubName={club.nome}
            onUpdateProgress={() => setShowModalProgresso(true)}
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
          <ClubAlmanaque
            club={club}
            clubId={club.id}
            currentUserId={session.user.id}
            isAdmin={isAdmin}
            onToast={showToast}
          />
        )}
        {isAdmin && activeTab === 4 && (
          <ClubGerenciar
            club={club}
            userId={session.user.id}
            members={members}
            activeMeta={activeMeta}
            onUpdate={handleGerenciarUpdate}
            onClubDeleted={onBack}
          />
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

      {toast && <div className="toast">{toast}</div>}

      {/* Sub-telas de palpites e apostas */}
      {subScreen === 'palpites' && (
        <ClubPalpites
          clubId={club.id}
          activeMeta={activeMeta}
          currentUserId={session.user.id}
          isAdmin={isAdmin}
          onBack={() => setSubScreen(null)}
          onToast={showToast}
        />
      )}
      {subScreen === 'apostas' && (
        <ClubApostas
          clubId={club.id}
          activeMeta={activeMeta}
          members={members}
          currentUserId={session.user.id}
          isAdmin={isAdmin}
          onBack={() => setSubScreen(null)}
          onToast={showToast}
        />
      )}
      {subScreen === 'criar-avaliacao' && (
        <ClubCriarAvaliacao
          onBack={() => setSubScreen(null)}
          onToast={showToast}
          onCreated={async (data) => {
            await createActivity(data)
          }}
        />
      )}
      {subScreen === 'avaliacao' && activity && (
        <ClubAvaliacaoTela
          activity={activity}
          answers={activityAnswers}
          grades={activityGrades}
          myAnswers={myActivityAnswers}
          myGrade={myActivityGrade}
          members={members}
          currentUserId={session.user.id}
          isAdmin={isAdmin}
          onBack={() => setSubScreen(null)}
          onToast={showToast}
          onSubmitAnswers={submitAnswers}
          onDeleteMyAnswers={deleteMyAnswers}
          onSaveGrade={saveGrade}
          onUpdateStatus={updateActivityStatus}
          onDeleteActivity={deleteActivity}
        />
      )}

      {pendingBadge && (
        <BadgePopup badge={pendingBadge} onClose={() => setPendingBadge(null)} />
      )}

      {showConvidar && (
        <ModalConvidar club={club} onClose={() => setShowConvidar(false)} />
      )}

      {showModalProgresso && (() => {
        const myMember = members.find(m => m.user_id === session.user.id)
        return (
          <ModalProgresso
            paginaAtual={myMember?.pagina_atual ?? null}
            paginaFim={activeMeta?.pagina_fim ?? null}
            userId={session.user.id}
            clubId={club.id}
            onClose={pg => {
              setShowModalProgresso(false)
              if (pg) refreshMembers()
            }}
          />
        )
      })()}
    </div>
  )
}
