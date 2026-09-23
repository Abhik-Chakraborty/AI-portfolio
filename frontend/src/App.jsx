import { useEffect, useRef, useState } from 'react'
import { fetchPersona } from './services/api'
import { useChat } from './hooks/useChat'
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
  const { messages, loading, send, clearHistory } = useChat()
  const messagesEndRef = useRef(null)

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

  const allMessages = messages.length === 0
    ? [WELCOME_MESSAGE]
    : messages

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        persona={persona}
        onQuestion={send}
        onClear={clearHistory}
      />

      {/* Main chat area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}>
        {/* Top bar */}
        <header style={{
          padding: '16px 28px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}>
              AI Portfolio Chat
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Ask anything — personal questions answered from my data, general questions searched from the web
            </p>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'block' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Personal</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--web-accent)', display: 'block' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Web search</span>
            </div>
          </div>
        </header>

        {/* Cold-start notice — only shown while the first request is slow */}
        {wakingUp && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '10px 28px',
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
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          {allMessages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              initials={persona?.initials}
            />
          ))}

          {loading && <TypingIndicator initials={persona?.initials} />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput onSend={send} loading={loading} />
      </main>
    </div>
  )
}
