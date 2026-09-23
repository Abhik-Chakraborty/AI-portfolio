import { useEffect, useRef, useState } from 'react'
import { fetchPersona } from './services/api'
import { useChat } from './hooks/useChat'
import { useMediaQuery } from './hooks/useMediaQuery'
import Sidebar from './components/Sidebar'
import MessageBubble from './components/MessageBubble'
import TypingIndicator from './components/TypingIndicator'
import ChatInput from './components/ChatInput'
import './styles/global.css'

/** Backend may still send old template strings — treat as missing so UI shows real defaults. */
function normalizePersona(p) {
  if (!p) return p
  const loc = (p.location ?? '').trim()
  const isPlaceholderLocation =
    !loc ||
    /^your city/i.test(loc) ||
    /^your city,\s*country$/i.test(loc)
  const tag = (p.tagline ?? '').trim()
  return {
    ...p,
    location: isPlaceholderLocation ? 'Mumbai, Maharashtra, India' : loc,
    tagline: tag || 'Junior Backend & Full Stack Developer',
  }
}

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: "Hey! I'm an AI version of **Abhik Chakraborty**. Ask me about my experience, projects, skills — or any general tech question you have.",
  meta: { type: 'personal' }
}

export default function App() {
  const [persona, setPersona] = useState(null)
  const [wakingUp, setWakingUp] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { messages, loading, send, clearHistory } = useChat()
  const messagesEndRef = useRef(null)

  const isMobile = useMediaQuery('(max-width: 768px)')

  useEffect(() => {
    // The backend is on Render's free tier, which spins down after ~15 min idle.
    // The first request then cold-starts and can take up to a minute. fetchPersona()
    // is the very first call the app makes, so we use it to detect that: if it hasn't
    // resolved within 3s, show a heads-up banner so visitors don't assume it's broken.
    const slowTimer = setTimeout(() => setWakingUp(true), 3000)

    fetchPersona()
      .then(data => setPersona(normalizePersona(data)))
      .catch(() =>
        setPersona(
          normalizePersona({
            name: 'Abhik Chakraborty',
            initials: 'AC',
            tagline: 'Junior Backend & Full Stack Developer',
            location: 'Mumbai, Maharashtra, India',
            github: 'https://github.com/Abhik-Chakraborty',
            linkedin: 'https://www.linkedin.com/in/abhik17/',
            email: 'abhik17.cfc@gmail.com',
          }),
        ),
      )
      .finally(() => {
        clearTimeout(slowTimer)
        setWakingUp(false)
      })

    return () => clearTimeout(slowTimer)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Close the drawer automatically when growing back to desktop width.
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false)
  }, [isMobile])

  const allMessages = messages.length === 0
    ? [WELCOME_MESSAGE]
    : messages

  // On mobile, tapping a suggested question or "clear" should also dismiss the drawer.
  const handleQuestion = (q) => {
    send(q)
    if (isMobile) setDrawerOpen(false)
  }
  const handleClear = () => {
    clearHistory()
    if (isMobile) setDrawerOpen(false)
  }

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      {/* ─── Sidebar: fixed column on desktop, slide-in drawer on mobile ─── */}
      {!isMobile ? (
        <Sidebar persona={persona} onQuestion={send} onClear={clearHistory} />
      ) : (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            aria-hidden={!drawerOpen}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(2px)',
              zIndex: 40,
              opacity: drawerOpen ? 1 : 0,
              pointerEvents: drawerOpen ? 'auto' : 'none',
              transition: 'opacity 0.28s ease',
            }}
          />
          {/* Drawer */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 'min(84vw, 320px)',
              zIndex: 50,
              transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.28s ease',
              boxShadow: drawerOpen ? '0 0 40px rgba(0, 0, 0, 0.5)' : 'none',
            }}
          >
            <Sidebar
              mobile
              persona={persona}
              onQuestion={handleQuestion}
              onClear={handleClear}
              onClose={() => setDrawerOpen(false)}
            />
          </div>
        </>
      )}

      {/* ─── Main chat area ─── */}
      <main style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}>
        {/* Top bar */}
        <header style={{
          padding: isMobile ? '12px 16px' : '16px 28px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {isMobile && (
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                style={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
              }}>
                AI Portfolio Chat
              </h2>
              {!isMobile && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Ask anything — personal questions answered from my data, general questions searched from the web
                </p>
              )}
            </div>
          </div>

          {/* Legend — hidden on mobile to save room */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'block' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Personal</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--web-accent)', display: 'block' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Web search</span>
              </div>
            </div>
          )}
        </header>

        {/* Cold-start notice — only shown while the first request is slow */}
        {wakingUp && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: isMobile ? '10px 16px' : '10px 28px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--accent-soft)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              color: 'var(--text-secondary)',
              animation: 'fadeUp 0.3s ease',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'block',
                flexShrink: 0,
                animation: 'pulse 1.2s ease-in-out infinite',
              }}
            />
            <span>
              Waking up the server — this is hosted on Render's free tier and can take up
              to a minute on the first visit. Thanks for your patience!
            </span>
          </div>
        )}

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '16px 14px' : '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? 16 : 20,
        }}>
          {allMessages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              initials={persona?.initials}
              isMobile={isMobile}
            />
          ))}

          {loading && <TypingIndicator initials={persona?.initials} />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput onSend={send} loading={loading} isMobile={isMobile} />
      </main>
    </div>
  )
}
