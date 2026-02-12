'use client'

import { useState } from 'react'

type ChatResponse = {
  answer: string
  citations: Array<{
    id: string
    title: string
    snippet: string
    score: number
  }>
  meta: {
    model: string
    latencyMs: number
  }
}

export default function Home() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<
      Array<{ role: 'user' | 'assistant'; content: string }>
  >([])
  const [lastCitations, setLastCitations] = useState<ChatResponse['citations']>([])
  const [lastMeta, setLastMeta] = useState<ChatResponse['meta'] | null>(null)

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    setMessages((m) => [...m, { role: 'user', content: text }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText)
      }

      const data = (await res.json()) as ChatResponse

      setMessages((m) => [...m, { role: 'assistant', content: data.answer }])
      setLastCitations(data.citations ?? [])
      setLastMeta(data.meta ?? null)
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: `오류: ${e?.message ?? 'unknown'}` }
      ])
      setLastCitations([])
      setLastMeta(null)
    } finally {
      setLoading(false)
    }
  }

  return (
      <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>RAG 챗봇 (포트폴리오)</h1>

        <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 12,
              padding: 12,
              height: 420,
              overflow: 'auto',
              marginTop: 12
            }}
        >
          {messages.length === 0 ? (
              <div style={{ opacity: 0.7 }}>
                예: “환불은 어떻게 해요?” / “운영시간 알려줘”
              </div>
          ) : (
              messages.map((m, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      {m.role === 'user' ? '나' : '챗봇'}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  </div>
              ))
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send()
              }}
              placeholder="질문을 입력하세요"
              style={{
                flex: 1,
                border: '1px solid #ddd',
                borderRadius: 10,
                padding: '10px 12px'
              }}
          />
          <button
              onClick={send}
              disabled={loading}
              style={{
                border: '1px solid #ddd',
                borderRadius: 10,
                padding: '10px 14px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
          >
            {loading ? '전송중' : '전송'}
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>출처(citations)</h2>
          {lastCitations.length === 0 ? (
              <div style={{ opacity: 0.7 }}>없음</div>
          ) : (
              <ul style={{ marginTop: 8 }}>
                {lastCitations.map((c) => (
                    <li key={c.id} style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 700 }}>
                        {c.title} <span style={{ opacity: 0.6 }}>({c.id})</span>
                      </div>
                      <div style={{ opacity: 0.85 }}>{c.snippet}</div>
                      <div style={{ opacity: 0.6, fontSize: 12 }}>score: {c.score}</div>
                    </li>
                ))}
              </ul>
          )}

          <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 16 }}>meta</h2>
          {lastMeta ? (
              <pre style={{ background: '#f7f7f7', padding: 12, borderRadius: 10 }}>
            {JSON.stringify(lastMeta, null, 2)}
          </pre>
          ) : (
              <div style={{ opacity: 0.7 }}>없음</div>
          )}
        </div>
      </main>
  )
}
