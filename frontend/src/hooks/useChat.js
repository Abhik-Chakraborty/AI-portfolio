import { useState, useCallback } from 'react'
import { sendMessage } from '../services/api'

export function useChat() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const addMessage = (role, content, meta = {}) => {
    setMessages(prev => [...prev, { role, content, meta, id: Date.now() + Math.random() }])
  }

  const send = useCallback(async (text) => {
    if (!text.trim() || loading) return

    // Add user message
    addMessage('user', text)
    setLoading(true)
    setError(null)

    // Build history for API (exclude current message)
    const history = messages.map(m => ({ role: m.role, content: m.content }))

    try {
      const data = await sendMessage(text, history)
      addMessage('assistant', data.reply, {
        type: data.type,
        sources: data.sources || []
      })
    } catch (err) {
      setError('Failed to get a response. Is the backend running?')
      addMessage('assistant', 'Sorry, I ran into an issue. Please try again.', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [messages, loading])

  const clearHistory = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, loading, error, send, clearHistory }
}
