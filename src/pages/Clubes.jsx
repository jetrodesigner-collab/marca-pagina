import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useClubs } from '../hooks/useClubs'
import { useClubMembers } from '../hooks/useClubMembers'
import ClubCard from '../components/clubs/ClubCard'
import ClubHeroCard from '../components/clubs/ClubHeroCard'
import ModalCriarClube from '../components/clubs/ModalCriarClube'
import ModalConvidar from '../components/clubs/ModalConvidar'

const TABS = ['Meus clubes', 'Explorar', 'Convites']

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

function HeroWithMeta({ club, onEnter, onInvite }) {
  const { activeMeta } = useClubMembers(club.id)
  return (
    <ClubHeroCard
      club={club}
      activeMeta={activeMeta}
      onEnter={onEnter}
      onInvite={onInvite}
    />
  )
}

export default function Clubes({ session, onNavigate }) {
  const [activeTab, setActiveTab] = useState(0)
  const [profile, setProfile] = useState(null)
  const [streak, setStreak] = useState(0)
  const [showCriar, setShowCriar] = useState(false)
  const [inviteClub, setInviteClub] = useState(null)
  const [toast, setToast] = useState(null)
  const [joiningId, setJoiningId] = useState(null)

  const { myClubs, publicClubs, invites, loading, refresh, createClub, joinClub, acceptInvite, declineInvite } = useClubs(session.user.id)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data))

    // buscar streak máximo entre todos os clubes
    supabase
      .from('club_members')
      .select('streak_atual')
      .eq('user_id', session.user.id)
      .eq('status', 'ativo')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setStreak(Math.max(...data.map(m => m.streak_atual || 0)))
        }
      })
  }, [session.user.id])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function handleCreateClub(params) {
    const club = await createClub(params)
    setShowCriar(false)
    onNavigate('clubeDetalhe', { club: { ...club, role: 'admin', pagina_atual: 0, streak_atual: 0, member_count: 1 } })
    return club
  }

  async function handleJoin(club) {
    setJoiningId(club.id)
    try {
      await joinClub(club.id)
      showToast('✓ Você entrou no clube!')
      setActiveTab(0)
    } catch {
      showToast('Erro ao entrar no clube.')
    } finally {
      setJoiningId(null)
    }
  }

  async function handleAccept(clubId) {
    try {
      await acceptInvite(clubId)
      showToast('✓ Convite aceito!')
      setActiveTab(0)
    } catch {
      showToast('Erro ao aceitar convite.')
    }
  }

  async function handleDecline(clubId) {
    try {
      await declineInvite(clubId)
      showToast('Convite recusado.')
    } catch {
      showToast('Erro ao recusar convite.')
    }
  }

  const initial = (profile?.full_name || profile?.username || session.user.email || '?')[0].toUpperCase()
  const heroClub = myClubs[0] || null
  const otherClubs = myClubs.slice(1)

  return (
    <div className="dark" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {BLOBS.map((b, i) => (
        <div key={i} style={{ position: 'fixed', borderRadius: '50%', filter: 'blur(55px)', pointerEvents: 'none', zIndex: 0, ...b }} />
      ))}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: 'var(--top-pad) 22px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-.3px', color: 'var(--text)' }}>
            Clubes<span style={{ color: 'var(--accent)' }}>·</span>do<span style={{ color: 'var(--accent)' }}>·</span>Livro
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {streak > 0 && (
              <div className="cl-streak" style={{ fontSize: 12 }}>
                🔥 <span style={{ fontSize: 14 }}>{streak}</span> dias
              </div>
            )}
            <button
              onClick={() => setShowCriar(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'var(--accent)',
                color: '#1A1720',
                border: 'none',
                borderRadius: 20,
                padding: '8px 13px',
                fontFamily: 'Figtree, sans-serif',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="6" y1="1" x2="6" y2="11"/>
                <line x1="1" y1="6" x2="11" y2="6"/>
              </svg>
              Criar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 22px', borderBottom: '1px solid rgba(196,168,240,.1)', flexShrink: 0 }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              style={{
                padding: '9px 0',
                marginRight: 20,
                fontFamily: 'Figtree, sans-serif',
                fontSize: 13,
                fontWeight: activeTab === i ? 600 : 500,
                color: activeTab === i ? 'var(--accent)' : 'var(--muted)',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === i ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all .18s',
                position: 'relative',
              }}
            >
              {tab}
              {i === 2 && invites.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 6,
                  right: -6,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                }} />
              )}
            </button>
          ))}
        </div>

        {/* Scroll area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 22px 120px', scrollbarWidth: 'none' }}>

          {loading && (
            <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--muted)' }}>
              Carregando...
            </div>
          )}

          {/* ABA: Meus clubes */}
          {!loading && activeTab === 0 && (
            <>
              {myClubs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>📚</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Nenhum clube ainda</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 24 }}>
                    Crie ou entre em um clube para ler com outras pessoas.
                  </div>
                  <button
                    onClick={() => setShowCriar(true)}
                    style={{ background: 'var(--accent)', color: '#1A1720', border: 'none', borderRadius: 20, padding: '10px 20px', fontFamily: 'Figtree, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Criar meu primeiro clube
                  </button>
                </div>
              ) : (
                <>
                  {heroClub && (
                    <HeroWithMeta
                      club={heroClub}
                      onEnter={() => onNavigate('clubeDetalhe', { club: heroClub })}
                      onInvite={() => setInviteClub(heroClub)}
                    />
                  )}

                  {otherClubs.length > 0 && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase', color: 'var(--muted)' }}>
                          Participando
                        </span>
                      </div>
                      {otherClubs.map(c => (
                        <ClubCard
                          key={c.id}
                          club={c}
                          onClick={() => onNavigate('clubeDetalhe', { club: c })}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* ABA: Explorar */}
          {!loading && activeTab === 1 && (
            <>
              {publicClubs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 12, color: 'var(--muted)' }}>
                  Nenhum clube público disponível agora.
                </div>
              ) : (
                publicClubs.map(c => (
                  <div key={c.id} style={{ position: 'relative' }}>
                    <ClubCard club={c} onClick={() => {}} />
                    <button
                      onClick={() => handleJoin(c)}
                      disabled={joiningId === c.id}
                      style={{
                        position: 'absolute',
                        right: 48,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'var(--accent)',
                        color: '#1A1720',
                        border: 'none',
                        borderRadius: 20,
                        padding: '6px 12px',
                        fontFamily: 'Figtree, sans-serif',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {joiningId === c.id ? '...' : 'Entrar'}
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {/* ABA: Convites */}
          {!loading && activeTab === 2 && (
            <>
              {invites.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 12, color: 'var(--muted)' }}>
                  Nenhum convite pendente.
                </div>
              ) : (
                invites.map(c => (
                  <div
                    key={c.id}
                    style={{
                      background: 'var(--sur)',
                      border: '1px solid rgba(196,168,240,.18)',
                      borderRadius: 14,
                      padding: 16,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{c.nome}</div>
                    {c.livro_titulo && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                        {c.livro_titulo}{c.livro_autor ? ` · ${c.livro_autor}` : ''}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleAccept(c.id)}
                        style={{ flex: 1, padding: '10px 0', background: 'var(--accent)', color: '#1A1720', border: 'none', borderRadius: 10, fontFamily: 'Figtree, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        ✓ Aceitar
                      </button>
                      <button
                        onClick={() => handleDecline(c.id)}
                        style={{ flex: 1, padding: '10px 0', background: 'rgba(255,255,255,.05)', color: 'var(--muted)', border: '1px solid var(--bor)', borderRadius: 10, fontFamily: 'Figtree, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
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
        {toast && <div className="toast">{toast}</div>}
      </div>

      {/* Modal criar */}
      {showCriar && (
        <ModalCriarClube
          userId={session.user.id}
          onClose={() => setShowCriar(false)}
          onCreate={handleCreateClub}
        />
      )}

      {/* Modal convidar */}
      {inviteClub && (
        <ModalConvidar
          club={inviteClub}
          onClose={() => setInviteClub(null)}
        />
      )}
    </div>
  )
}
