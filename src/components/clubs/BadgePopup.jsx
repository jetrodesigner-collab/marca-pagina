export default function BadgePopup({ badge, onClose }) {
  if (!badge) return null

  return (
    <>
      <div
        className="cl-overlay show"
        onClick={onClose}
      />
      <div className="cl-badge-popup show">
        <div style={{ fontSize: 48, marginBottom: 12 }}>{badge.icone}</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Conquista desbloqueada!
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>
          {badge.label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 20 }}>
          {BADGE_DESC[badge.tipo] || 'Você ganhou um novo selo.'}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'var(--accent)',
            color: '#1A1720',
            border: 'none',
            borderRadius: 10,
            padding: '9px 24px',
            fontFamily: 'Figtree, sans-serif',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Ver meu perfil
        </button>
      </div>
    </>
  )
}

const BADGE_DESC = {
  fundador: 'Você criou este clube e mantém a turma unida.',
  chama_viva: 'Manteve o streak de leitura por 7 dias seguidos!',
  comentarista: 'Mais de 10 comentários em discussões do clube.',
  madrugador: 'Postou trechos entre 00h e 05h da manhã.',
  leitor_relampago: 'Terminou a meta com mais de 24h de antecedência!',
  meta_coletiva: 'O grupo inteiro concluiu a meta semanal. Card Dourado desbloqueado!',
}

export { BADGE_DESC }
