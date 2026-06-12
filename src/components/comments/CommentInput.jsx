import { useState } from 'react'

export default function CommentInput({ onSend, onError }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const hasText = text.trim().length > 0

  async function handleSend() {
    if (!hasText || sending) return
    const content = text.trim()
    setSending(true)
    setText('')
    const { error } = await onSend(content)
    setSending(false)
    if (error) onError?.()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="comment-bar">
      <input
        type="text"
        className="comment-input-field"
        placeholder="Escreva um comentário público..."
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        className="comment-send-btn"
        onClick={handleSend}
        disabled={!hasText || sending}
        style={{
          background: hasText ? 'var(--accent)' : 'rgba(196,168,240,0.15)',
          opacity: hasText ? 1 : 0.4,
          cursor: hasText ? 'pointer' : 'not-allowed',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  )
}
