import { useState } from 'react'
import CategoryModal from './CategoryModal'

const PALETTES = {
  reading:      ['#3E6E94', '#5A8AAE', '#82B4D8', '#9ACAEF', '#6FA0C8'],
  want_to_read: ['#A85C32', '#C97B4A', '#E0A06A', '#D88F5C', '#B8693A'],
  read:         ['#3E7256', '#4A8A6A', '#6AAE8A', '#7DC4A0', '#5A9A78'],
}

export const SHELF_META = [
  { key: 'reading',      label: 'Lendo',     dotClass: 'DL' },
  { key: 'want_to_read', label: 'Quero Ler', dotClass: 'DQ' },
  { key: 'read',         label: 'Lidos',     dotClass: 'DD' },
]

function BookShelfSVG({ colors }) {
  const heights = [34, 42, 30, 38, 36]
  const widths  = [12, 10, 14, 11, 13]
  let x = 4

  return (
    <svg viewBox="0 0 100 50" width="100%" height="56" style={{ display: 'block' }}>
      {heights.map((h, i) => {
        const w = widths[i]
        const rectX = x
        x += w + 2
        return (
          <g key={i}>
            <rect x={rectX} y={46 - h} width={w} height={h} rx="1.5" fill={colors[i % colors.length]} />
            <rect x={rectX + 2} y={46 - h + 6} width={Math.max(w - 4, 2)} height="1.4" rx="0.7" fill="rgba(255,255,255,0.35)" />
            <rect x={rectX + 2} y={46 - h + 11} width={Math.max(w - 6, 2)} height="1.4" rx="0.7" fill="rgba(255,255,255,0.2)" />
          </g>
        )
      })}
      <rect x="2" y="47" width="96" height="2.5" rx="1.25" fill="rgba(196,168,240,0.25)" />
    </svg>
  )
}

function ShelfCard({ label, dotClass, count, palette, onClick }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--sur)',
        border: `1px solid ${hover ? 'rgba(196,168,240,0.32)' : 'rgba(196,168,240,0.15)'}`,
        borderRadius: 16,
        padding: '14px 8px 12px',
        cursor: 'pointer',
        transition: 'all .25s',
        transform: hover ? 'translateY(-2px)' : 'none',
        backdropFilter: 'blur(16px)',
        boxShadow: hover ? '0 6px 20px var(--shad)' : '0 4px 14px var(--shad)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <BookShelfSVG colors={palette} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div className={`dot ${dotClass}`} />
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{label}</div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{count} {count === 1 ? 'livro' : 'livros'}</div>
    </div>
  )
}

export default function ShelvesSection({ counts, bookItems, userId, onItemClick }) {
  const [openCategory, setOpenCategory] = useState(null)
  const activeMeta = SHELF_META.find(m => m.key === openCategory)

  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {SHELF_META.map(meta => (
          <ShelfCard
            key={meta.key}
            label={meta.label}
            dotClass={meta.dotClass}
            count={counts[meta.key] || 0}
            palette={PALETTES[meta.key]}
            onClick={() => setOpenCategory(meta.key)}
          />
        ))}
      </div>

      {activeMeta && (
        <CategoryModal
          category={activeMeta.key}
          meta={activeMeta}
          userId={userId}
          bookItems={bookItems}
          onItemClick={onItemClick}
          onClose={() => setOpenCategory(null)}
        />
      )}
    </div>
  )
}
