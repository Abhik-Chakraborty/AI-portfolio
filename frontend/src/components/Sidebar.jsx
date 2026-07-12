import { useState } from 'react'

const SUGGESTED_QUESTIONS = [
  "What's your experience?",
  "Tell me about your projects",
  "What's your tech stack?",
  "What are your strengths?",
  "Are you open to work?",
  "How do React hooks work?",
  "What is REST vs GraphQL?",
  "What's the difference between SQL and NoSQL?",
]

export default function Sidebar({ persona, onQuestion, onClear }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <aside style={{
      width: 280,
      flexShrink: 0,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 20px',
      gap: 28,
      overflowY: 'auto',
    }}>
      {/* Avatar + name */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--accent-soft)',
          border: '2px solid var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color: 'var(--accent)',
          margin: '0 auto 14px',
          letterSpacing: 1,
        }}>
          {persona?.initials || 'AC'}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 4,
        }}>
          {persona?.name || 'Abhik Chakraborty'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {persona?.tagline || 'Junior Backend & Full Stack Developer'}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
          📍 {persona?.location || 'Mumbai, Maharashtra, India'}
        </p>

        {/* Status badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 12,
          padding: '4px 12px',
          borderRadius: 'var(--radius-pill)',
          background: 'rgba(45, 212, 100, 0.1)',
          border: '1px solid rgba(45, 212, 100, 0.2)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#4ade80',
            animation: 'pulse 2s infinite'
          }} />
          <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 500 }}>Online · Ask me anything</span>
        </div>
      </div>

      {/* Contact links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
          Contact
        </p>
        {[
          { label: 'GitHub', icon: '⌥', href: persona?.github },
          { label: 'LinkedIn', icon: '◈', href: persona?.linkedin },
          { label: 'Email', icon: '✉', href: persona?.email ? `mailto:${persona.email}` : null },
        ].map(link => (
          <a
            key={link.label}
            href={link.href || '#'}
            target={link.href?.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              color: link.href ? 'var(--text-secondary)' : 'var(--text-muted)',
              transition: 'all 0.15s',
              textDecoration: 'none',
              border: '1px solid transparent',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--accent-soft)'
              e.currentTarget.style.color = 'var(--accent)'
              e.currentTarget.style.borderColor = 'var(--accent-glow)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = link.href ? 'var(--text-secondary)' : 'var(--text-muted)'
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            <span style={{ fontSize: 14 }}>{link.icon}</span>
            {link.label}
            {!link.href && <span style={{ fontSize: 10, marginLeft: 'auto', color: 'var(--text-muted)' }}>placeholder</span>}
          </a>
        ))}
      </div>

      {/* Suggested questions */}
      <div style={{ flex: 1 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: 10 }}
          onClick={() => setExpanded(e => !e)}
        >
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Ask me
          </p>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{expanded ? '▲' : '▼'}</span>
        </div>

        {expanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SUGGESTED_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => onQuestion(q)}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  transition: 'all 0.15s',
                  lineHeight: 1.4,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--accent-soft)'
                  e.currentTarget.style.color = 'var(--accent)'
                  e.currentTarget.style.borderColor = 'var(--accent-glow)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-card)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clear chat */}
      <button
        onClick={onClear}
        style={{
          padding: '8px 16px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 12,
          color: 'var(--text-muted)',
          border: '1px solid var(--border)',
          background: 'transparent',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
          e.currentTarget.style.color = '#f87171'
          e.currentTarget.style.background = 'rgba(239,68,68,0.06)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-muted)'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        Clear conversation
      </button>
    </aside>
  )
}
