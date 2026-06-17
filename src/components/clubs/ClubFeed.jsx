import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useClubPosts } from '../../hooks/useClubPosts'
import { useStreak } from '../../hooks/useStreak'
import { checkBadges } from '../../hooks/useBadges'
import PostItem from './PostItem'
import MetaColetivaCard from './MetaColetivaCard'

const PROGRESS_RULES = [
  { pct: '100%',   icone: '✅', label: 'Meta Concluída' },
  { pct: '90–99%', icone: '⚡', label: 'Leitor Relâmpago' },
  { pct: '75–89%', icone: '🔥', label: 'Chama Viva' },
  { pct: '60–74%', icone: '🌅', label: 'Madrugador' },
  { pct: '50–59%', icone: '📖', label: 'No Ritmo' },
  { pct: '30–49%', icone: '🐢', label: 'Tartaruga Literária' },
  { pct: '15–29%', icone: '😴', label: 'Soneca entre Capítulos' },
  { pct: '1–14%',  icone: '👀', label: 'Só Olhou a Capa' },
  { pct: '0%',     icone: '🛋️', label: 'Membro Honorário do Sofá' },
]

const RANK_RULES = [
  { medal: '🥇', label: '1º lugar — Medalha de Ouro' },
  { medal: '🥈', label: '2º lugar — Medalha de Prata' },
  { medal: '🥉', label: '3º lugar — Medalha de Bronze' },
]

const SPECIAL_RULES = [
  { icone: '👑', label: 'Fundador',  desc: 'Criador do clube' },
  { icone: '🏆', label: 'Pioneiro',  desc: 'Primeiro a atingir 100%' },
  { icone: '🔥', label: 'X dias',    desc: 'Dias consecutivos registrando progresso' },
]

const MOODS = [
  { emoji: '😱', label: 'Medo' },
  { emoji: '🤔', label: 'Suspense' },
  { emoji: '💔', label: 'Tristeza' },
  { emoji: '😂', label: 'Divertido' },
  { emoji: '😮', label: 'Surpresa' },
]

const MEMBER_COLORS = [
  { bg: 'rgba(196,168,240,.14)', color: '#C4A8F0' },
  { bg: 'rgba(126,223,168,.13)', color: '#7EDFA8' },
  { bg: 'rgba(240,201,122,.13)', color: '#F0C97A' },
]

function colorFor(id) {
  let h = 0
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) % MEMBER_COLORS.length
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length]
}

export default function ClubFeed({ club, activeMeta, members, currentUserId, isAdmin, onBadgeUnlock, onToast, profile }) {
  const { posts, loading, addPost, toggleLike, deletePost, refresh } = useClubPosts(club.id, currentUserId)
  const { updateStreak } = useStreak()
  const [composerText, setComposerText] = useState('')
  const [composerMode, setComposerMode] = useState('comentario')
  const [trechoText, setTrechoText] = useState('')
  const [trechoPagina, setTrechoPagina] = useState('')
  const [trechoCapitulo, setTrechoCapitulo] = useState('')
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [novaPagina, setNovaPagina] = useState('')
  const [posting, setPosting] = useState(false)
  const [showRegras, setShowRegras] = useState(false)

  // Humor do grupo
  const [myMood, setMyMood] = useState(null)
  const [moodTotals, setMoodTotals] = useState({})
  const [moodLoading, setMoodLoading] = useState(false)

  const initialUser = (profile?.full_name || profile?.username || '?').charAt(0).toUpperCase()
  const userColor = colorFor(currentUserId)
  const totalVotos = Object.values(moodTotals).reduce((s, v) => s + v, 0)

  useEffect(() => {
    loadMoods()
  }, [club.id, activeMeta?.id])

  async function loadMoods() {
    try {
      const { data } = await supabase
        .from('club_moods')
        .select('user_id, mood')
        .eq('club_id', club.id)
      if (!data) return
      const my = data.find(d => d.user_id === currentUserId)
      setMyMood(my?.mood || null)
      const totals = {}
      data.forEach(d => { totals[d.mood] = (totals[d.mood] || 0) + 1 })
      setMoodTotals(totals)
    } catch {
      // tabela pode não existir ainda — silencioso
    }
  }

  async function handleMoodSelect(label) {
    if (moodLoading) return
    const newMood = myMood === label ? null : label
    setMyMood(newMood)
    setMoodLoading(true)
    try {
      if (newMood) {
        await supabase.from('club_moods').upsert({
          club_id: club.id,
          meta_id: activeMeta?.id || null,
          user_id: currentUserId,
          mood: newMood,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'club_id,user_id' })
      } else {
        await supabase.from('club_moods').delete()
          .eq('club_id', club.id).eq('user_id', currentUserId)
      }
      await loadMoods()
    } catch {
      // silencioso se tabela não existe
    } finally {
      setMoodLoading(false)
    }
  }

  async function publish() {
    if (posting) return
    const conteudo = composerText.trim()
    if (!conteudo && composerMode === 'comentario') return

    setPosting(true)
    try {
      const hour = new Date().getHours()
      if (composerMode === 'progresso') {
        const pg = parseInt(novaPagina)
        if (!pg) return
        const newStreak = await updateStreak(currentUserId, club.id, pg)
        await supabase
          .from('club_members')
          .update({ pagina_atual: pg })
          .eq('club_id', club.id)
          .eq('user_id', currentUserId)
        await addPost({ tipo: 'progresso', conteudo: conteudo || null, trecho_pagina: pg })
        const newBadges = await checkBadges(currentUserId, club.id, { postHour: hour, meta: activeMeta })
        newBadges.forEach(b => onBadgeUnlock && onBadgeUnlock(b))
        if (newStreak) onToast && onToast(`🔥 Streak: ${newStreak} dias!`)
        setNovaPagina('')
      } else if (composerMode === 'trecho') {
        if (!trechoText.trim()) return
        await addPost({
          tipo: 'trecho',
          conteudo: conteudo || null,
          trecho_texto: trechoText.trim(),
          trecho_pagina: trechoPagina ? parseInt(trechoPagina) : null,
          trecho_capitulo: trechoCapitulo || null,
          is_spoiler: isSpoiler,
        })
        const newBadges = await checkBadges(currentUserId, club.id, { postHour: hour })
        newBadges.forEach(b => onBadgeUnlock && onBadgeUnlock(b))
        setTrechoText(''); setTrechoPagina(''); setTrechoCapitulo(''); setIsSpoiler(false)
      } else {
        await addPost({ tipo: 'comentario', conteudo })
        const newBadges = await checkBadges(currentUserId, club.id, { postHour: hour })
        newBadges.forEach(b => onBadgeUnlock && onBadgeUnlock(b))
      }
      setComposerText('')
      setComposerMode('comentario')
      onToast && onToast('✓ Publicado!')
    } catch {
      onToast && onToast('Erro ao publicar.')
    } finally {
      setPosting(false)
    }
  }

  async function handleReply(parentId, text) {
    try {
      await addPost({ tipo: 'comentario', conteudo: text, parent_id: parentId })
    } catch {
      onToast && onToast('Erro ao responder.')
    }
  }

  return (
    <div style={{ padding: '28px 22px 120px' }}>

      {/* Regras de premiação */}
      <div style={{ background: 'var(--sur)', border: '1px solid var(--bor)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
        <button
          onClick={() => setShowRegras(v => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Figtree, sans-serif', fontSize: 12, fontWeight: 700, color: 'var(--text)',
          }}
        >
          <span>🏆 Regras de premiação</span>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{showRegras ? '▲' : '▼'}</span>
        </button>
        {showRegras && (
          <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--bor)' }}>
            <div style={{ paddingTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.9px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
                Badges por progresso
              </div>
              {PROGRESS_RULES.map(r => (
                <div key={r.pct} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{r.icone}</span>
                  <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600, flex: 1 }}>{r.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>{r.pct}</span>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--bor)', margin: '14px 0' }} />
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.9px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
                Medalhas de ranking
              </div>
              {RANK_RULES.map(r => (
                <div key={r.medal} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{r.medal}</span>
                  <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>{r.label}</span>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--bor)', margin: '14px 0' }} />
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.9px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
                Badges especiais
              </div>
              {SPECIAL_RULES.map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{r.icone}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{r.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Humor do grupo */}
      <div className="cl-mood">
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>
          Humor do grupo nesta meta
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {MOODS.map(m => {
            const count = moodTotals[m.label] || 0
            const pct = totalVotos > 0 ? Math.round((count / totalVotos) * 100) : 0
            const isSelected = myMood === m.label
            return (
              <button
                key={m.label}
                onClick={() => handleMoodSelect(m.label)}
                className="cl-mood-pill"
                style={isSelected ? { borderColor: 'rgba(196,168,240,.35)', background: 'rgba(196,168,240,.08)' } : {}}
              >
                {m.emoji}
                <span style={{ display: 'block', fontSize: 9, color: isSelected ? 'var(--accent)' : 'var(--muted)', marginTop: 3 }}>{m.label}</span>
                {totalVotos > 0 && (
                  <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: isSelected ? 'var(--accent)' : 'rgba(240,235,248,.4)', marginTop: 1 }}>{pct}%</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Meta coletiva */}
      <MetaColetivaCard
        members={members}
        activeMeta={activeMeta}
      />

      {/* Composer */}
      <div className="cl-composer">
        <div className="cl-comp-ava" style={{ background: userColor.bg, color: userColor.color }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : initialUser}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {composerMode === 'progresso' && (
            <div style={{ marginBottom: 8 }}>
              <input
                type="number"
                placeholder="Nova página atual..."
                value={novaPagina}
                onChange={e => setNovaPagina(e.target.value)}
                style={{
                  width: '100%', background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(196,168,240,.15)', borderRadius: 8,
                  padding: '8px 10px', fontFamily: 'Figtree, sans-serif',
                  fontSize: 12, color: 'var(--text)', outline: 'none', marginBottom: 6,
                }}
              />
            </div>
          )}
          {composerMode === 'trecho' && (
            <div style={{ marginBottom: 8 }}>
              <textarea
                placeholder="Trecho do livro..."
                value={trechoText}
                onChange={e => setTrechoText(e.target.value)}
                rows={3}
                style={{
                  width: '100%', background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(196,168,240,.15)', borderRadius: 8,
                  padding: '8px 10px', fontFamily: 'Figtree, sans-serif',
                  fontSize: 12, color: 'var(--text)', outline: 'none',
                  resize: 'none', marginBottom: 6, fontStyle: 'italic',
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" placeholder="Página" value={trechoPagina} onChange={e => setTrechoPagina(e.target.value)}
                  style={{ flex: 1, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(196,168,240,.15)', borderRadius: 8, padding: '6px 8px', fontFamily: 'Figtree, sans-serif', fontSize: 11, color: 'var(--text)', outline: 'none' }} />
                <input placeholder="Capítulo" value={trechoCapitulo} onChange={e => setTrechoCapitulo(e.target.value)}
                  style={{ flex: 2, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(196,168,240,.15)', borderRadius: 8, padding: '6px 8px', fontFamily: 'Figtree, sans-serif', fontSize: 11, color: 'var(--text)', outline: 'none' }} />
                <button onClick={() => setIsSpoiler(v => !v)}
                  style={{ background: isSpoiler ? 'rgba(240,122,122,.2)' : 'rgba(255,255,255,.04)', color: isSpoiler ? '#F07A7A' : 'var(--muted)', border: `1px solid ${isSpoiler ? 'rgba(240,122,122,.35)' : 'rgba(196,168,240,.15)'}`, borderRadius: 8, padding: '6px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Figtree, sans-serif', whiteSpace: 'nowrap' }}>
                  ⚠ Spoiler
                </button>
              </div>
            </div>
          )}
          <textarea
            className="cl-comp-inp"
            placeholder={composerMode === 'progresso' ? 'Comentário opcional...' : 'Compartilhe um pensamento…'}
            value={composerText}
            onChange={e => setComposerText(e.target.value)}
            rows={1}
            style={{ height: composerMode === 'comentario' ? 36 : 30 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button onClick={() => setComposerMode(composerMode === 'trecho' ? 'comentario' : 'trecho')} className="cl-comp-btn"
              style={composerMode === 'trecho' ? { borderColor: 'rgba(196,168,240,.35)', color: 'var(--accent)' } : {}}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 4h12M2 8h8M2 12h5"/></svg>
              Citar
            </button>
            <button onClick={() => setComposerMode(composerMode === 'progresso' ? 'comentario' : 'progresso')} className="cl-comp-btn"
              style={composerMode === 'progresso' ? { borderColor: 'rgba(196,168,240,.35)', color: 'var(--accent)' } : {}}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><polyline points="8 5 8 8 10 10"/></svg>
              Pág.
            </button>
            <button className="cl-comp-send" onClick={publish} disabled={posting}>
              {posting ? '...' : 'Publicar'}
            </button>
          </div>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--muted)' }}>Carregando...</div>}

      {!loading && posts.map(post => (
        <PostItem
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onToggleLike={toggleLike}
          onDelete={deletePost}
          onReply={handleReply}
          activeMeta={activeMeta}
          onCutucar={p => onToast && onToast(`⚡ ${(p.profile?.full_name || p.profile?.username || 'Membro')} foi cutucado!`)}
        />
      ))}

      {!loading && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--muted)' }}>
          Nenhum post ainda. Seja o primeiro a compartilhar!
        </div>
      )}
    </div>
  )
}
