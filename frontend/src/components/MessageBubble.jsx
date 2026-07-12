import ReactMarkdown from 'react-markdown'

export default function MessageBubble({ message, initials }) {
  const isUser = message.role === 'user'
  const isWeb = message.meta?.type === 'web'
  const sources = message.meta?.sources || []

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 12,
      alignItems: 'flex-start',
      animation: 'fadeUp 0.25s ease',
    }}>
      {/* Avatar */}
      <div style={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'var(--font-display)',
        background: isUser ? 'var(--accent)' : 'var(--bg-card)',
        border: isUser ? 'none' : '1px solid var(--border)',
        color: isUser ? '#fff' : 'var(--accent)',
        letterSpacing: 0.5,
        marginTop: 2,
      }}>
        {isUser ? 'You' : (initials || 'YN')}
      </div>

      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Bubble */}
        <div style={{
          padding: '12px 16px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          fontSize: 14,
          lineHeight: 1.65,
          background: isUser ? 'var(--accent)' : 'var(--bg-card)',
          color: isUser ? '#fff' : 'var(--text-primary)',
          border: isUser ? 'none' : '1px solid var(--border)',
        }}>
          {isUser ? (
            message.content
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p style={{ margin: '0 0 8px' }}>{children}</p>,
                strong: ({ children }) => <strong style={{ color: 'var(--accent)', fontWeight: 600 }}>{children}</strong>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--web-accent)', textDecoration: 'underline' }}>
                    {children}
                  </a>
                ),
                ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: '6px 0' }}>{children}</ul>,
                li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                code: ({ children }) => (
                  <code style={{
                    background: 'rgba(124,111,247,0.15)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: 'monospace',
                  }}>
                    {children}
                  </code>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Web sources badge */}
        {isWeb && sources.length > 0 && (
          <div style={{
            background: 'var(--web-soft)',
            border: '1px solid rgba(45,212,191,0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
          }}>
            <p style={{ fontSize: 11, color: 'var(--web-accent)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              🔍 Sources from the web
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--web-accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  <span style={{ color: 'var(--web-accent)', marginRight: 6 }}>{i + 1}.</span>
                  {src.title}
                  <span style={{ color: 'var(--text-muted)', fontSize: 10, display: 'block', marginLeft: 14, marginTop: 1 }}>
                    {src.url.replace(/^https?:\/\//, '').split('/')[0]}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
