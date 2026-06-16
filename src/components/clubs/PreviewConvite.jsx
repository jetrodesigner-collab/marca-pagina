import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function PreviewConvite({ code, session, onNavigate }) {
  const [club, setClub] = useState(null)
  const [adminProfile, setAdminProfile] = useState(null)
  const [memberCount, setMemberCount] = useState(0)
  const [activeMeta, setActiveMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (code) load()
  }, [code])

  async function load() {
    setLoading(true)
    const { data: clubData } = await supabase
      .from('clubs')
      .select('*')
      .eq('codigo_convite', code)
      .single()

    if (!clubData) {
      setErr('Convite inválido ou expirado.')
      setLoading(false)
      return
    }

    setClub(clubData)

    const [{ data: admin }, { count }, { data: meta }] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('id', clubData.criador_id)
        .single(),
      supabase
        .from('club_members')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubData.id)
        .eq('status', 'ativo'),
      supabase
        .from('club_metas')
        .select('titulo, data_limite')
        .eq('club_id', clubData.id)
        .eq('ativa', true)
        .limit(1),
    ])

    setAdminProfile(admin)
    setMemberCount(count || 0)
    setActiveMeta(meta?.[0] || null)
    setLoading(false)
  }

  async function handleJoin() {
    if (!session) {
      onNavigate('login')
      return
    }
    setJoining(true)
    setErr('')
    try {
      if (!club.convite_ativo) throw new Error('Este convite foi desativado.')

      const status = club.privacidade === 'publico' ? 'ativo' : 'pendente'
      const { error } = await supabase.from('club_members').insert({
        club_id: club.id,
        user_id: session.user.id,
        role: 'membro',
        status,
      })
      if (error) throw new Error('Você já é membro deste clube.')
      setJoined(true)
      setTimeout(() => onNavigate('clubes'), 1200)
    } catch (e) {
      setErr(e.message)
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#1A1720', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>Carregando convite...</div>
      </div>
    )
  }

  if (err && !club) {
    return (
      <div style={{ minHeight: '100vh', background: '#1A1720', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Convite inválido</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, textAlign: 'center' }}>{err}</div>
        <button
          onClick={() => onNavigate('clubes')}
          style={{ background: 'var(--accent)', color: '#1A1720', border: 'none', borderRadius: 12, padding: '12px 24px', fontFamily: 'Figtree, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          Ver clubes
        </button>
      </div>
    )
  }

  const creatorName = adminProfile?.full_name || adminProfile?.username || 'Alguém'

  return (
    <div style={{ minHeight: '100vh', background: '#1A1720', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>

        {/* Capa */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {club.livro_capa ? (
            <img src={club.livro_capa} alt="" style={{ width: 80, height: 110, borderRadius: 8, objectFit: 'cover', boxShadow: '0 12px 32px rgba(0,0,0,.5)', margin: '0 auto 12px' }} />
          ) : (
            <div style={{ width: 80, height: 110, borderRadius: 8, background: 'rgba(196,168,240,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 12px' }}>📚</div>
          )}
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', marginBottom: 4 }}>{club.nome}</div>
          {club.livro_titulo && (
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
              {club.livro_titulo}{club.livro_autor ? ` · ${club.livro_autor}` : ''}
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Criado por {creatorName}
          </div>
        </div>

        {/* Stats */}
        <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(196,168,240,.12)', borderRadius: 14, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 16 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{memberCount}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Membros</div>
          </div>
          <div style={{ width: 1, background: 'rgba(196,168,240,.12)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>
              {club.privacidade === 'publico' ? '🌍' : '🔒'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
              {club.privacidade === 'publico' ? 'Público' : 'Privado'}
            </div>
          </div>
        </div>

        {activeMeta && (
          <div style={{ background: 'linear-gradient(90deg,rgba(196,168,240,.16),rgba(158,120,240,.08))', border: '1px solid rgba(196,168,240,.15)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>🎯 Meta atual: {activeMeta.titulo}</div>
            {activeMeta.data_limite && (
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                Até {new Date(activeMeta.data_limite).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>
        )}

        {club.descricao && (
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20, textAlign: 'center' }}>
            {club.descricao}
          </div>
        )}

        {err && <div style={{ color: '#F07A7A', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>{err}</div>}

        {joined ? (
          <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#7EDFA8' }}>
            ✓ Você entrou no clube!
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joining || !club.convite_ativo}
            style={{
              width: '100%',
              padding: 14,
              background: club.convite_ativo ? 'var(--accent)' : 'rgba(255,255,255,.1)',
              color: club.convite_ativo ? '#1A1720' : 'var(--muted)',
              border: 'none',
              borderRadius: 14,
              fontFamily: 'Figtree, sans-serif',
              fontSize: 14,
              fontWeight: 800,
              cursor: club.convite_ativo ? 'pointer' : 'default',
            }}
          >
            {joining ? 'Entrando...' : club.convite_ativo ? 'Entrar no clube' : 'Convite desativado'}
          </button>
        )}
      </div>
    </div>
  )
}
