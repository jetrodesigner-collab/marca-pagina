import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

async function toWebP400(file) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const SIZE = 400
      const canvas = document.createElement('canvas')
      canvas.width = SIZE; canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      const ratio = Math.max(SIZE / img.width, SIZE / img.height)
      const w = img.width * ratio; const h = img.height * ratio
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h)
      canvas.toBlob(blob => resolve(new File([blob], 'foto.webp', { type: 'image/webp' })), 'image/webp', 0.82)
    }
    img.src = URL.createObjectURL(file)
  })
}

const MEMBER_COLORS = [
  { bg: 'rgba(196,168,240,.14)', color: '#C4A8F0' },
  { bg: 'rgba(126,223,168,.13)', color: '#7EDFA8' },
  { bg: 'rgba(240,201,122,.13)', color: '#F0C97A' },
  { bg: 'rgba(240,122,122,.13)', color: '#F07A7A' },
  { bg: 'rgba(122,170,206,.13)', color: '#7AAACE' },
  { bg: 'rgba(208,130,208,.13)', color: '#D082D0' },
]
function colorFor(id) {
  let h = 0
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) % MEMBER_COLORS.length
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length]
}

const labelStyle = {
  fontSize: 10, fontWeight: 700, color: 'var(--muted)',
  letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6,
}
const sectionTitle = {
  fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
  color: 'var(--accent)', marginBottom: 14,
}

export default function ClubGerenciar({ club, userId, members, activeMeta, onUpdate, onClubDeleted }) {
  // Edit club
  const [nome, setNome] = useState(club.nome || '')
  const [descricao, setDescricao] = useState(club.descricao || '')
  const [livroTitulo, setLivroTitulo] = useState(club.livro_titulo || '')
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(club.foto_url || null)
  const [savingClub, setSavingClub] = useState(false)
  const fileRef = useRef(null)

  // Edit meta
  const [capInicio, setCapInicio] = useState(activeMeta?.cap_inicio || '')
  const [capFim, setCapFim] = useState(activeMeta?.cap_fim || '')
  const [paginaFim, setPaginaFim] = useState(activeMeta?.pagina_fim || '')
  const [prazoDias, setPrazoDias] = useState('')
  const [savingMeta, setSavingMeta] = useState(false)

  // Sincroniza campos quando activeMeta carrega após a montagem do componente
  useEffect(() => {
    if (activeMeta) {
      setCapInicio(activeMeta.cap_inicio || '')
      setCapFim(activeMeta.cap_fim || '')
      setPaginaFim(activeMeta.pagina_fim || '')
    }
  }, [activeMeta?.id])

  // Close cycle
  const [confirmClose, setConfirmClose] = useState(false)
  const [closingMeta, setClosingMeta] = useState(false)

  // Remove member
  const [removingId, setRemovingId] = useState(null)

  // Delete club
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletingClub, setDeletingClub] = useState(false)

  const [toast, setToast] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  async function handleFotoChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const webp = await toWebP400(file)
    setFotoFile(webp)
    setFotoPreview(URL.createObjectURL(webp))
  }

  async function saveClub() {
    if (!nome.trim()) { showToast('Nome é obrigatório.'); return }
    setSavingClub(true)
    try {
      let foto_url = club.foto_url
      if (fotoFile) {
        const path = `clubs/${userId}/${crypto.randomUUID()}.webp`
        const { error: upErr } = await supabase.storage.from('covers').upload(path, fotoFile)
        if (upErr) throw upErr
        foto_url = supabase.storage.from('covers').getPublicUrl(path).data.publicUrl
      }
      const { error } = await supabase.from('clubs').update({
        nome: nome.trim(), descricao: descricao.trim() || null, foto_url,
        livro_titulo: livroTitulo.trim() || null,
      }).eq('id', club.id)
      if (error) throw error
      onUpdate && onUpdate({ clubData: { nome: nome.trim(), descricao: descricao.trim() || null, foto_url, livro_titulo: livroTitulo.trim() || null } })
      showToast('✓ Clube atualizado!')
    } catch {
      showToast('Erro ao salvar.')
    } finally {
      setSavingClub(false)
    }
  }

  async function saveMeta() {
    setSavingMeta(true)
    try {
      const updates = {
        cap_inicio: capInicio ? parseInt(capInicio) : null,
        cap_fim: capFim ? parseInt(capFim) : null,
        pagina_fim: paginaFim ? parseInt(paginaFim) : null,
      }
      if (prazoDias) {
        updates.data_limite = new Date(Date.now() + parseInt(prazoDias) * 86400000).toISOString().slice(0, 10)
      }
      const parts = []
      if (updates.cap_inicio && updates.cap_fim) parts.push(`Caps. ${updates.cap_inicio}–${updates.cap_fim}`)
      else if (updates.cap_fim) parts.push(`até cap. ${updates.cap_fim}`)
      if (updates.pagina_fim) parts.push(`até pág. ${updates.pagina_fim}`)
      if (parts.length) updates.titulo = parts.join(' · ')

      let savedMeta
      if (activeMeta?.id) {
        const { data, error } = await supabase
          .from('club_metas')
          .update(updates)
          .eq('id', activeMeta.id)
          .select()
        if (error) throw error
        if (!data || data.length === 0) throw new Error('update-blocked')
        savedMeta = data[0]
      } else {
        const { data, error } = await supabase
          .from('club_metas')
          .insert({ club_id: club.id, ...updates, titulo: updates.titulo || 'Meta', ativa: true })
          .select()
        if (error) throw error
        if (!data || data.length === 0) throw new Error('insert-blocked')
        savedMeta = data[0]
      }
      onUpdate && onUpdate({ newMeta: savedMeta })
      showToast('✓ Meta atualizada!')
    } catch (err) {
      console.error('[saveMeta]', err)
      showToast('Erro ao salvar meta.')
    } finally {
      setSavingMeta(false)
    }
  }

  async function closeMeta() {
    setClosingMeta(true)
    try {
      // 1. Set meta to inactive
      await supabase.from('club_metas').update({ ativa: false }).eq('id', activeMeta.id)

      // 2. Reveal all predictions for this meta
      await supabase.from('club_predictions')
        .update({ revealed: true })
        .eq('club_id', club.id)
        .eq('meta_id', activeMeta.id)

      // 3. Compute fulfilled status for all bets using current member pages
      const { data: bets } = await supabase
        .from('club_page_bets')
        .select('id, user_id, bet_pages')
        .eq('club_id', club.id)
        .eq('meta_id', activeMeta.id)

      if (bets?.length) {
        const memberPageMap = {}
        members.forEach(m => { memberPageMap[m.user_id] = m.pagina_atual || 0 })
        await Promise.all(bets.map(bet => {
          const finalPages = memberPageMap[bet.user_id] || 0
          return supabase.from('club_page_bets').update({
            fulfilled: finalPages >= bet.bet_pages,
            final_pages: finalPages,
          }).eq('id', bet.id)
        }))
      }

      setConfirmClose(false)
      onUpdate && onUpdate({})
      showToast('✓ Ciclo encerrado! Palpites revelados automaticamente.')
    } catch (err) {
      console.error('[closeMeta]', err)
      showToast('Erro ao encerrar ciclo.')
    } finally {
      setClosingMeta(false)
    }
  }

  async function removeMember(memberId) {
    if (memberId === userId) { showToast('Você não pode se remover.'); return }
    setRemovingId(memberId)
    try {
      const { error } = await supabase.from('club_members').delete()
        .eq('club_id', club.id).eq('user_id', memberId)
      if (error) throw error
      onUpdate && onUpdate({})
      showToast('✓ Membro removido.')
    } catch {
      showToast('Erro ao remover.')
    } finally {
      setRemovingId(null)
    }
  }

  async function deleteClub() {
    setDeletingClub(true)
    try {
      const { error } = await supabase.from('clubs').delete().eq('id', club.id)
      console.log('[deleteClub] result:', { error })
      if (error) throw error
      onClubDeleted && onClubDeleted()
    } catch (err) {
      console.error('[deleteClub] error:', err)
      showToast('Erro ao excluir clube.')
      setDeletingClub(false)
    }
  }

  const sectionBox = { background: 'var(--sur)', border: '1px solid var(--bor)', borderRadius: 14, padding: 18, marginBottom: 16 }

  return (
    <div style={{ padding: '24px 22px 120px' }}>

      {/* Editar clube */}
      <div style={sectionBox}>
        <div style={sectionTitle}>✏️ Editar clube</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div onClick={() => fileRef.current?.click()}
            style={{
              width: 60, height: 60, borderRadius: 12, cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
              border: `2px dashed ${fotoPreview ? 'transparent' : 'rgba(196,168,240,.35)'}`,
              background: fotoPreview ? 'transparent' : 'rgba(196,168,240,.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {fotoPreview
              ? <img src={fotoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(196,168,240,.6)" strokeWidth="1.8"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            }
          </div>
          <button type="button" onClick={() => fileRef.current?.click()}
            style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Figtree, sans-serif', fontWeight: 600 }}>
            {fotoPreview ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoChange} />
        </div>

        <label style={labelStyle}>Nome</label>
        <input className="finp" value={nome} onChange={e => setNome(e.target.value)} style={{ marginBottom: 12 }} />

        <label style={labelStyle}>Descrição</label>
        <textarea className="finp" value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} style={{ resize: 'none', marginBottom: 12 }} />

        <label style={labelStyle}>Livro atual</label>
        <input className="finp" value={livroTitulo} onChange={e => setLivroTitulo(e.target.value)} placeholder="Título do livro" style={{ marginBottom: 16 }} />

        <button
          onClick={saveClub} disabled={savingClub}
          style={{
            width: '100%', padding: '11px 0', background: 'var(--accent)', color: '#1A1720',
            border: 'none', borderRadius: 10, fontFamily: 'Figtree, sans-serif',
            fontSize: 13, fontWeight: 700, cursor: savingClub ? 'default' : 'pointer', opacity: savingClub ? .6 : 1,
          }}>
          {savingClub ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>

      {/* Encerrar ciclo */}
      {activeMeta && (
        <div style={{ ...sectionBox, border: '1px solid rgba(240,201,122,.25)', background: 'rgba(240,201,122,.03)' }}>
          <div style={{ ...sectionTitle, color: '#F0C97A' }}>🔄 Encerrar ciclo atual</div>
          <div style={{ fontSize: 12, color: 'rgba(240,235,248,.7)', marginBottom: 14, lineHeight: 1.5 }}>
            Meta: <strong style={{ color: 'var(--text)' }}>{activeMeta.titulo}</strong>
            <br />
            Encerrar revela automaticamente todos os palpites. O ciclo vai para o Almanaque.
          </div>
          {!confirmClose ? (
            <button
              onClick={() => setConfirmClose(true)}
              style={{
                width: '100%', padding: '11px 0',
                background: 'rgba(240,201,122,.12)', color: '#F0C97A',
                border: '1px solid rgba(240,201,122,.3)', borderRadius: 10,
                fontFamily: 'Figtree, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Encerrar este ciclo
            </button>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 14, lineHeight: 1.5 }}>
                Confirmar encerramento? Esta ação é irreversível. Os palpites serão revelados e o ciclo irá para o histórico.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setConfirmClose(false)}
                  style={{ flex: 1, padding: '10px 0', background: 'var(--sur)', color: 'var(--muted)', border: '1px solid var(--bor2)', borderRadius: 10, fontFamily: 'Figtree, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={closeMeta}
                  disabled={closingMeta}
                  style={{ flex: 1, padding: '10px 0', background: '#F0C97A', color: '#1A1720', border: 'none', borderRadius: 10, fontFamily: 'Figtree, sans-serif', fontSize: 12, fontWeight: 700, cursor: closingMeta ? 'default' : 'pointer', opacity: closingMeta ? .6 : 1 }}
                >
                  {closingMeta ? 'Encerrando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editar meta */}
      <div style={sectionBox}>
        <div style={sectionTitle}>🎯 {activeMeta ? 'Editar meta ativa' : 'Criar meta'}</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ ...labelStyle, marginBottom: 4 }}>Cap. inicial</label>
            <input className="finp" type="number" placeholder="Ex: 10" value={capInicio} onChange={e => setCapInicio(e.target.value)} style={{ marginBottom: 0 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ ...labelStyle, marginBottom: 4 }}>Cap. final</label>
            <input className="finp" type="number" placeholder="Ex: 15" value={capFim} onChange={e => setCapFim(e.target.value)} style={{ marginBottom: 0 }} />
          </div>
        </div>

        <label style={labelStyle}>Total de páginas</label>
        <input className="finp" type="number" placeholder="Ex: 250" value={paginaFim} onChange={e => setPaginaFim(e.target.value)} style={{ marginBottom: 10 }} />

        <label style={labelStyle}>Novo prazo (dias a partir de hoje)</label>
        <input className="finp" type="number" placeholder="Ex: 7" value={prazoDias} onChange={e => setPrazoDias(e.target.value)} min={1} max={365} style={{ marginBottom: 14 }} />

        <button
          onClick={saveMeta} disabled={savingMeta}
          style={{
            width: '100%', padding: '11px 0', background: 'rgba(196,168,240,.15)',
            color: 'var(--accent)', border: '1px solid rgba(196,168,240,.25)',
            borderRadius: 10, fontFamily: 'Figtree, sans-serif',
            fontSize: 13, fontWeight: 700, cursor: savingMeta ? 'default' : 'pointer', opacity: savingMeta ? .6 : 1,
          }}>
          {savingMeta ? 'Salvando...' : activeMeta ? 'Atualizar meta' : 'Criar meta'}
        </button>
      </div>

      {/* Membros */}
      <div style={sectionBox}>
        <div style={sectionTitle}>👥 Membros ({members.length})</div>
        {members.map(m => {
          const profile = m.profile || {}
          const name = profile.full_name || profile.username || 'Usuário'
          const color = colorFor(m.user_id)
          const initial = name.charAt(0).toUpperCase()
          const isMe = m.user_id === userId
          const joinedAt = m.joined_at ? new Date(m.joined_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) : null

          return (
            <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--bor2)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: color.bg, color: color.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name}{isMe ? ' (você)' : ''}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {m.role === 'admin' ? 'Admin' : 'Membro'}{joinedAt ? ` · entrou ${joinedAt}` : ''}
                </div>
              </div>
              {!isMe && (
                <button
                  onClick={() => removeMember(m.user_id)}
                  disabled={removingId === m.user_id}
                  style={{
                    fontSize: 10, fontWeight: 600, color: '#F07A7A',
                    background: 'rgba(240,122,122,.1)', border: '1px solid rgba(240,122,122,.2)',
                    borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontFamily: 'Figtree, sans-serif',
                    flexShrink: 0, opacity: removingId === m.user_id ? .5 : 1,
                  }}>
                  {removingId === m.user_id ? '...' : 'Remover'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Regras de premiação */}
      <div style={sectionBox}>
        <div style={sectionTitle}>📜 Regras de premiação</div>

        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.9px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
          Badges por progresso
        </div>
        {[
          { pct: '100%',   icone: '✅', label: 'Meta Concluída' },
          { pct: '90–99%', icone: '⚡', label: 'Leitor Relâmpago' },
          { pct: '75–89%', icone: '🔥', label: 'Chama Viva' },
          { pct: '60–74%', icone: '🌅', label: 'Madrugador' },
          { pct: '50–59%', icone: '📖', label: 'No Ritmo' },
          { pct: '30–49%', icone: '🐢', label: 'Tartaruga Literária' },
          { pct: '15–29%', icone: '😴', label: 'Soneca entre Capítulos' },
          { pct: '1–14%',  icone: '👀', label: 'Só Olhou a Capa' },
          { pct: '0%',     icone: '🛋️', label: 'Membro Honorário do Sofá' },
        ].map(r => (
          <div key={r.pct} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
            <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{r.icone}</span>
            <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600, flex: 1 }}>{r.label}</span>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{r.pct}</span>
          </div>
        ))}

        <div style={{ height: 1, background: 'var(--bor)', margin: '12px 0' }} />

        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.9px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
          Medalhas de ranking
        </div>
        {[
          { medal: '🥇', label: '1º lugar — Medalha de Ouro' },
          { medal: '🥈', label: '2º lugar — Medalha de Prata' },
          { medal: '🥉', label: '3º lugar — Medalha de Bronze' },
        ].map(r => (
          <div key={r.medal} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
            <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{r.medal}</span>
            <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>{r.label}</span>
          </div>
        ))}

        <div style={{ height: 1, background: 'var(--bor)', margin: '12px 0' }} />

        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.9px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
          Badges especiais
        </div>
        {[
          { icone: '👑', label: 'Fundador', desc: 'Criador do clube' },
          { icone: '🏆', label: 'Pioneiro', desc: 'Primeiro a atingir 100%' },
          { icone: '🔥', label: 'X dias', desc: 'Dias consecutivos registrando progresso' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{r.icone}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{r.label}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{r.desc}</div>
            </div>
          </div>
        ))}

        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 12, lineHeight: 1.5, fontStyle: 'italic' }}>
          As regras são visíveis para todos os membros na aba Progresso.
        </div>
      </div>

      {/* Zona de perigo */}
      <div style={{ ...sectionBox, border: '1px solid rgba(240,122,122,.25)', background: 'rgba(240,122,122,.04)' }}>
        <div style={{ ...sectionTitle, color: '#F07A7A' }}>⚠️ Zona de perigo</div>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              width: '100%', padding: '11px 0',
              background: 'rgba(240,122,122,.12)', color: '#F07A7A',
              border: '1px solid rgba(240,122,122,.3)', borderRadius: 10,
              fontFamily: 'Figtree, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
            Excluir clube permanentemente
          </button>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 14, lineHeight: 1.5 }}>
              Tem certeza? Esta ação é <strong>irreversível</strong>. Todos os posts, membros e histórico serão apagados.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)}
                style={{ flex: 1, padding: '10px 0', background: 'var(--sur)', color: 'var(--muted)', border: '1px solid var(--bor2)', borderRadius: 10, fontFamily: 'Figtree, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={deleteClub} disabled={deletingClub}
                style={{ flex: 1, padding: '10px 0', background: '#F07A7A', color: '#fff', border: 'none', borderRadius: 10, fontFamily: 'Figtree, sans-serif', fontSize: 12, fontWeight: 700, cursor: deletingClub ? 'default' : 'pointer', opacity: deletingClub ? .6 : 1 }}>
                {deletingClub ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
