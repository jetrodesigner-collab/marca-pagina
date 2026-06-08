import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const FRASES = [
  { t: 'Os livros são espelhos: só vemos neles o que já temos dentro de nós.', a: 'Carlos Ruiz Zafón' },
  { t: 'Um leitor vive mil vidas antes de morrer. Aquele que nunca lê vive apenas uma.', a: 'George R.R. Martin' },
  { t: 'Não existe amigo tão leal quanto um livro.', a: 'Ernest Hemingway' },
  { t: 'Ler é sonhar pela mão de outrem.', a: 'Fernando Pessoa' },
  { t: 'Os livros são a prova de que a humanidade é capaz de fazer magia.', a: 'Carl Sagan' },
  { t: 'O cinema pode preencher nos seres humanos o vazio deixado pela vida.', a: 'François Truffaut' },
  { t: 'A imaginação é mais importante que o conhecimento.', a: 'Albert Einstein' },
  { t: 'O cinema é a arte de mostrar nada acontecendo de maneiras interessantes.', a: 'Orson Welles' },
  { t: 'Sublinha o que te move. É aí que você mora.', a: 'Clarice Lispector' },
  { t: 'Toda grande história começa com alguém que não desistiu.', a: 'Fiódor Dostoiévski' },
]

const CATS_LIVROS = ['Todos', 'Ficção Científica', 'Lit. Brasileira', 'Lit. Internacional', 'Filosofia', 'Fantasia', 'Romance', 'História', 'Biografia', 'Psicologia', 'Negócios', 'Autoajuda', 'Policial', 'Outros']
const CATS_FILMES = ['Todos', 'Drama', 'Comédia', 'Ficção Científica', 'Ação', 'Terror', 'Suspense', 'Romance', 'Animação', 'Documentário', 'Histórico', 'Crime', 'Outros']

const BLOBS = [
  { width: 260, height: 260, background: 'var(--bl1)', top: -80, left: -80 },
  { width: 220, height: 220, background: 'var(--bl2)', top: 100, right: -70 },
  { width: 240, height: 240, background: 'var(--bl3)', bottom: 120, left: -60 },
  { width: 200, height: 200, background: 'var(--bl4)', bottom: 40, right: -50 },
]

function getDailyFrase() {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 0)
  return FRASES[Math.floor((d - start) / 86400000) % FRASES.length]
}

function EmptySection({ label, badgeClass, dotClass }) {
  return (
    <div className="ss">
      <div className="sh">
        <div className={`sb ${badgeClass}`}>
          <div className={`dot ${dotClass}`} />
          {label}
        </div>
      </div>
      <div className="brow">
        <div className="addc">
          ＋
          <span>Adicionar</span>
        </div>
      </div>
    </div>
  )
}

function LibrarySection({ tipo }) {
  const [activeCat, setActiveCat] = useState('Todos')
  const cats = tipo === 'L' ? CATS_LIVROS : CATS_FILMES
  const noun = tipo === 'L' ? 'livro' : 'filme'

  return (
    <div style={{ marginTop: 8 }}>
      <span className="bib-t">Biblioteca</span>
      <input
        className="bib-srch"
        placeholder="Buscar na biblioteca..."
        readOnly
      />
      <div className="cats">
        {cats.map(cat => (
          <button
            key={cat}
            className={`cat${activeCat === cat ? ' on' : ''}`}
            onClick={() => setActiveCat(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      <div style={{
        textAlign: 'center',
        padding: '28px 0 24px',
        color: 'var(--muted)',
      }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>{tipo === 'L' ? '📚' : '🎬'}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>
          Sua biblioteca está vazia
        </div>
        <div style={{ fontSize: 11, lineHeight: 1.55 }}>
          Adicione seu primeiro {noun} por aqui
        </div>
      </div>
    </div>
  )
}

export default function Library({ session, onNavigate }) {
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('L')
  const [theme] = useState(() => localStorage.getItem('tema') || 'D')

  const frase = getDailyFrase()

  useEffect(() => {
    supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [session.user.id])

  const themeClass = theme === 'L' ? 'light' : 'dark'
  const initial = (
    profile?.full_name ||
    profile?.username ||
    session.user.email ||
    '?'
  )[0].toUpperCase()

  return (
    <div
      className={themeClass}
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background blobs */}
      {BLOBS.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            borderRadius: '50%',
            filter: 'blur(55px)',
            pointerEvents: 'none',
            zIndex: 0,
            ...b,
          }}
        />
      ))}

      {/* Shell */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}>

        {/* Topbar */}
        <div className="topbar">
          <div className="logo">marca<em>·página</em></div>
          <div
            className="av"
            style={profile?.avatar_url ? { padding: 0, overflow: 'hidden' } : {}}
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initial
            }
          </div>
        </div>

        {/* Frase do dia */}
        <div className="qbox">
          <div className="qbig">"</div>
          <div className="qt">{frase.t}</div>
          <div className="qa">— {frase.a}</div>
        </div>

        {/* Divisor */}
        <div className="gl" />

        {/* Abas */}
        <div className="mtabs">
          <div
            className={`mt${activeTab === 'L' ? ' on' : ''}`}
            onClick={() => setActiveTab('L')}
          >
            📚 Livros
          </div>
          <div
            className={`mt${activeTab === 'F' ? ' on' : ''}`}
            onClick={() => setActiveTab('F')}
          >
            🎬 Filmes
          </div>
        </div>

        {/* Conteúdo — Livros */}
        <div className="sc" style={{ display: activeTab === 'L' ? undefined : 'none' }}>
          <EmptySection label="Lendo" badgeClass="BL" dotClass="DL" />
          <EmptySection label="Quero Ler" badgeClass="BQ" dotClass="DQ" />
          <EmptySection label="Lidos" badgeClass="BD" dotClass="DD" />
          <LibrarySection tipo="L" />
        </div>

        {/* Conteúdo — Filmes */}
        <div className="sc" style={{ display: activeTab === 'F' ? undefined : 'none' }}>
          <EmptySection label="Assistidos" badgeClass="BD" dotClass="DD" />
          <EmptySection label="Quero Ver" badgeClass="BQ" dotClass="DQ" />
          <LibrarySection tipo="F" />
        </div>

        {/* Bottom navigation */}
        <div className="bnav">
          <div className="ni on">
            <span className="nic">📚</span>
            <span className="nla">Biblioteca</span>
          </div>
          <div className="ni">
            <span className="nic">👥</span>
            <span className="nla">Comunidade</span>
          </div>
          <div className="ni" onClick={() => onNavigate('search')}>
            <span className="nic">🔍</span>
            <span className="nla">Buscar</span>
          </div>
          <div className="ni">
            <span className="nic">👤</span>
            <span className="nla">Perfil</span>
          </div>
        </div>
      </div>
    </div>
  )
}
