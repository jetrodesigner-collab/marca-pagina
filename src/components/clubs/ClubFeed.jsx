import { useState } from 'react'
import { useClubPosts } from '../../hooks/useClubPosts'
import { useStreak } from '../../hooks/useStreak'
import { checkBadges } from '../../hooks/useBadges'
import PostItem from './PostItem'
import MetaColetivaCard from './MetaColetivaCard'

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

export default function ClubFeed({ club, activeMeta, members, currentUserId, onBadgeUnlock, onToast, profile }) {
  const { posts, loading, addPost, toggleLike, deletePost, refresh } = useClubPosts(club.id, currentUserId)
  const { updateStreak } = useStreak()
  const [composerText, setComposerText] = useState('')
  const [composerMode, setComposerMode] = useState('comentario') // 'comentario' | 'trecho' | 'progresso'
  const [trechoText, setTrechoText] = useState('')
  const [trechoPagina, setTrechoPagina] = useState('')
  const [trechoCapitulo, setTrechoCapitulo] = useState('')
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [novaPagina, setNovaPagina] = useState('')
  const [selectedMood, setSelectedMood] = useState(null)
  const [posting, setPosting] = useState(false)

  const initialUser = (profile?.full_name || profile?.username || '?').charAt(0).toUpperCase()
  const userColor = colorFor(currentUserId)

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
        await addPost({
          tipo: 'progresso',
          conteudo: conteudo || null,
          trecho_pagina: pg,
        })
        const newBadges = await checkBadges(currentUserId, club.id, {
          postHour: hour,
          meta: activeMeta,
        })
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
        setTrechoText('')
        setTrechoPagina('')
        setTrechoCapitulo('')
        setIsSpoiler(false)
      } else {
        await addPost({ tipo: 'comentario', conteudo })
        const newBadges = await checkBadges(currentUserId, club.id, { postHour: hour })
        newBadges.forEach(b => onBadgeUnlock && onBadgeUnlock(b))
      }
      setComposerText('')
      setComposerMode('comentario')
      onToast && onToast('✓ Publicado!')
    } catch (e) {
      onToast && onToast('Erro ao publicar.')
    } finally {
      setPosting(false)
    }
  }

  async function handleReply(parentId, text) {
    try {
      await addPost({ tipo: 'comentario', conteudo: text, parent_id: parentId })
    } catch (e) {
      onToast && onToast('Erro ao responder.')
    }
  }

  return (
    <div style={{ padding: '28px 22px 120px' }}>

      {/* Humor do grupo */}
      <div className="cl-mood">
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>
          Humor do grupo nesta meta
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {MOODS.map(m => (
            <button
              key={m.label}
              onClick={() => setSelectedMood(selectedMood === m.label ? null : m.label)}
              className="cl-mood-pill"
              style={selectedMood === m.label ? { borderColor: 'rgba(196,168,240,.35)', background: 'rgba(196,168,240,.08)' } : {}}
            >
              {m.emoji}
              <span style={{ display: 'block', fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Meta coletiva */}
      <MetaColetivaCard
        members={members}
        activeMeta={activeMeta}
        clubId={club.id}
        onBadgeUnlock={onBadgeUnlock}
      />

      {/* Composer */}
      <div className="cl-composer">
        <div
          className="cl-comp-ava"
          style={{ background: userColor.bg, color: userColor.color }}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : initialUser}
        </div>
        <div style={{ flex: 1 }}>
          {composerMode === 'progresso' && (
            <div style={{ marginBottom: 8 }}>
              <input
                type="number"
                placeholder="Nova página atual..."
                value={novaPagina}
                onChange={e => setNovaPagina(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(196,168,240,.15)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontFamily: 'Figtree, sans-serif',
                  fontSize: 12,
                  color: 'var(--text)',
                  outline: 'none',
                  marginBottom: 6,
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
                  width: '100%',
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(196,168,240,.15)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontFamily: 'Figtree, sans-serif',
                  fontSize: 12,
                  color: 'var(--text)',
                  outline: 'none',
                  resize: 'none',
                  marginBottom: 6,
                  fontStyle: 'italic',
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number"
                  placeholder="Página"
                  value={trechoPagina}
                  onChange={e => setTrechoPagina(e.target.value)}
                  style={{ flex: 1, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(196,168,240,.15)', borderRadius: 8, padding: '6px 8px', fontFamily: 'Figtree, sans-serif', fontSize: 11, color: 'var(--text)', outline: 'none' }}
                />
                <input
                  placeholder="Capítulo"
                  value={trechoCapitulo}
                  onChange={e => setTrechoCapitulo(e.target.value)}
                  style={{ flex: 2, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(196,168,240,.15)', borderRadius: 8, padding: '6px 8px', fontFamily: 'Figtree, sans-serif', fontSize: 11, color: 'var(--text)', outline: 'none' }}
                />
                <button
                  onClick={() => setIsSpoiler(v => !v)}
                  style={{
                    background: isSpoiler ? 'rgba(240,122,122,.2)' : 'rgba(255,255,255,.04)',
                    color: isSpoiler ? '#F07A7A' : 'var(--muted)',
                    border: `1px solid ${isSpoiler ? 'rgba(240,122,122,.35)' : 'rgba(196,168,240,.15)'}`,
                    borderRadius: 8,
                    padding: '6px 8px',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'Figtree, sans-serif',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ⚠ Spoiler
                </button>
              </div>
            </div>
          )}
          <textarea
            className="cl-comp-inp"
            placeholder={
              composerMode === 'progresso'
                ? 'Comentário opcional...'
                : 'Compartilhe um pensamento…'
            }
            value={composerText}
            onChange={e => setComposerText(e.target.value)}
            rows={composerMode === 'comentario' ? 1 : 1}
            style={{ height: composerMode === 'comentario' ? 36 : 30 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              onClick={() => setComposerMode(composerMode === 'trecho' ? 'comentario' : 'trecho')}
              className="cl-comp-btn"
              style={composerMode === 'trecho' ? { borderColor: 'rgba(196,168,240,.35)', color: 'var(--accent)' } : {}}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 4h12M2 8h8M2 12h5"/>
              </svg>
              Citar
            </button>
            <button
              onClick={() => setComposerMode(composerMode === 'progresso' ? 'comentario' : 'progresso')}
              className="cl-comp-btn"
              style={composerMode === 'progresso' ? { borderColor: 'rgba(196,168,240,.35)', color: 'var(--accent)' } : {}}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="8" cy="8" r="6"/><polyline points="8 5 8 8 10 10"/>
              </svg>
              Pág.
            </button>
            <button
              className="cl-comp-send"
              onClick={publish}
              disabled={posting}
            >
              {posting ? '...' : 'Publicar'}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--muted)' }}>
          Carregando...
        </div>
      )}

      {!loading && posts.map(post => (
        <PostItem
          key={post.id}
          post={post}
          currentUserId={currentUserId}
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
