import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ModalConvidar({ club, onClose }) {
  const [copied, setCopied] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [conviteAtivo, setConviteAtivo] = useState(club.convite_ativo)

  const link = `${window.location.origin}/convite/${club.codigo_convite}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select text
    }
  }

  async function toggleConvite() {
    setToggling(true)
    const newVal = !conviteAtivo
    await supabase
      .from('clubs')
      .update({ convite_ativo: newVal })
      .eq('id', club.id)
    setConviteAtivo(newVal)
    setToggling(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Convidar membros</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
          Compartilhe o link ou código com quem você quer convidar.
        </div>

        {/* Código curto */}
        <div style={{
          background: 'rgba(196,168,240,.1)',
          border: '1px solid rgba(196,168,240,.2)',
          borderRadius: 14,
          padding: '16px 20px',
          textAlign: 'center',
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Código do convite
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', letterSpacing: 4, fontFamily: 'monospace' }}>
            {(club.codigo_convite || '').toUpperCase()}
          </div>
        </div>

        {/* Link */}
        <div style={{
          background: 'rgba(255,255,255,.04)',
          border: '1px solid var(--bor)',
          borderRadius: 12,
          padding: '10px 14px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ flex: 1, fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {link}
          </span>
          <button
            onClick={copyLink}
            style={{
              background: copied ? 'rgba(126,223,168,.2)' : 'var(--accent)',
              color: copied ? '#7EDFA8' : '#1A1720',
              border: 'none',
              borderRadius: 8,
              padding: '6px 12px',
              fontFamily: 'Figtree, sans-serif',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>

        {/* Toggle convite ativo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,.04)',
          border: '1px solid var(--bor)',
          borderRadius: 12,
          padding: '12px 14px',
          marginBottom: 20,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Convite ativo</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {conviteAtivo ? 'Qualquer pessoa com o link pode entrar' : 'Ninguém pode entrar pelo link'}
            </div>
          </div>
          <button
            onClick={toggleConvite}
            disabled={toggling}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              border: 'none',
              background: conviteAtivo ? 'var(--accent)' : 'rgba(255,255,255,.12)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background .2s',
              flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute',
              top: 2,
              left: conviteAtivo ? 22 : 2,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#fff',
              transition: 'left .2s',
              boxShadow: '0 1px 4px rgba(0,0,0,.3)',
            }} />
          </button>
        </div>

        <button className="post-cancel-btn" onClick={onClose} style={{ width: '100%' }}>
          Fechar
        </button>
      </div>
    </div>
  )
}
