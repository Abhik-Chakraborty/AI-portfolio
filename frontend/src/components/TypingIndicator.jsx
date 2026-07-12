export default function TypingIndicator({ initials }) {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      animation: 'fadeUp 0.2s ease',
    }}>
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
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        color: 'var(--accent)',
        marginTop: 2,
      }}>
        {initials || 'YN'}
      </div>

      <div style={{
        padding: '14px 18px',
        borderRadius: '18px 18px 18px 4px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'block',
            animation: `dot-bounce 1.2s infinite`,
            animationDelay: `${i * 0.2}s`,
            opacity: 0.7,
          }} />
        ))}
      </div>
    </div>
  )
}
