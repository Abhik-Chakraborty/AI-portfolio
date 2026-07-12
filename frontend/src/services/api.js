const BASE_URL = '/api'

export async function fetchPersona() {
  const res = await fetch(`${BASE_URL}/persona`)
  if (!res.ok) throw new Error('Failed to fetch persona')
  return res.json()
}

export async function sendMessage(message, history) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history })
  })
  if (!res.ok) throw new Error('Chat request failed')
  return res.json()
}
