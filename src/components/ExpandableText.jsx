import { useLayoutEffect, useRef, useState } from 'react'

// Texto com clamp de 3 linhas e botão "Ver mais ↓" / "Ver menos ↑"
export default function ExpandableText({ text, className = '' }) {
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setOverflowing(el.scrollHeight > el.clientHeight + 1)
  }, [text])

  return (
    <div>
      <div ref={ref} className={`exp-text${expanded ? '' : ' collapsed'} ${className}`}>
        {text}
      </div>
      {overflowing && (
        <span className="exp-toggle" onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Ver menos ↑' : 'Ver mais ↓'}
        </span>
      )}
    </div>
  )
}
