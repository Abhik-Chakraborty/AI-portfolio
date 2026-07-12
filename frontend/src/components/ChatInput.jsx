import { useState, useRef, useEffect } from 'react'

export default function ChatInput({ onSend, loading }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  const handleSend = () => {
    if (!value.trim() || loading) return
    onSend(value.trim())
    setValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e) => {
    setValue(e.target.value)
    adjustTextareaHeight()
  }

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const maxHeight = 200
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px'
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [value])

  return (
    <div style={{
      padding: '16px 24px 20px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-surface)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 12,
        background: 'var(--bg-input)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '4px 6px 4px 18px',
        transition: 'border-color 0.2s',
      }}
        onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent-glow)'}
        onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask me about my projects, skills, or anything tech…"
          disabled={loading}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 14,
            color: 'var(--text-primary)',
            padding: '10px 0',
            lineHeight: 1.5,
            fontFamily: 'inherit',
            resize: 'none',
            minHeight: '40px',
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        />

        <button
          onClick={handleSend}
          disabled={!value.trim() || loading}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: (!value.trim() || loading) ? 'var(--border)' : 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            flexShrink: 0,
            opacity: (!value.trim() || loading) ? 0.5 : 1,
          }}
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
        Powered by Claude AI · General questions searched via Google
      </p>
    </div>
  )
}
