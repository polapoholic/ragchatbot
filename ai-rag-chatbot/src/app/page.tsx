'use client'

import { useEffect, useRef, useState } from 'react'



type Citation = {
    id: string
    title: string
    snippet: string
    score: number
}

type Meta = {
    model: string
    latencyMs: number
}

type ChatResponse = {
    answer: string
    citations: Citation[]
    meta: Meta
}

type Message = {
    id: string
    role: 'user' | 'assistant'
    content: string
    citations?: Citation[]
    meta?: Meta | null
    createdAt: number
    error?: boolean
}

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

function Sources({ citations }: { citations?: Citation[] }) {
    if (!citations || citations.length === 0) return null

    return (
        <details className="mt-2 rounded-xl border border-zinc-200 bg-white/80 p-3">
            <summary className="cursor-pointer text-xs text-zinc-600">
                Sources ({citations.length})
            </summary>

            <div className="mt-3 space-y-2">
                {citations.map((c) => (
                    <div key={c.id} className="rounded-lg bg-gray-50 p-3 text-xs">
                        <div className="font-medium text-gray-900">
                            {c.title}{' '}
                            <span className="text-gray-400 font-normal">({c.id})</span>
                        </div>
                        <div className="mt-1 text-gray-700 opacity-90">{c.snippet}</div>
                        <div className="mt-1 text-[11px] text-gray-500">
                            score: {c.score}
                        </div>
                    </div>
                ))}
            </div>
        </details>
    )
}

function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === 'user'

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%]">
                <div className={`mb-1 text-[11px] font-semibold ${isUser ? 'text-zinc-500 text-right' : 'text-zinc-500'}`}>
                {isUser ? 'You' : 'Assistant'}
                </div>

                <div
                    className={[
                        'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-wrap',
                        isUser
                            ? 'bg-zinc-800 text-zinc-50'
                            : message.error
                                ? 'bg-rose-50 border border-rose-200 text-rose-800'
                                : 'bg-zinc-50 border border-zinc-200 text-zinc-900'
                    ].join(' ')}
                >

                {message.content}
                </div>

                {!isUser ? <Sources citations={message.citations} /> : null}

                {!isUser && message.meta ? (
                    <div className="mt-2 text-[11px] text-gray-400">
                        {message.meta.model} · {message.meta.latencyMs}ms
                    </div>
                ) : null}
            </div>
        </div>
    )
}

export default function Home() {
    const inputRef = useRef<HTMLTextAreaElement | null>(null)
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const listRef = useRef<HTMLDivElement | null>(null)

    const scrollToBottom = () => {
        const el = listRef.current
        if (!el) return
        el.scrollTop = el.scrollHeight
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages.length])

    const send = async () => {
        const text = input.trim()
        if (!text || loading) return

        const userMessage: Message = {
            id: uid(),
            role: 'user',
            content: text,
            createdAt: Date.now()
        }

        setMessages((m) => [...m, userMessage])
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
                throw new Error(errText || `HTTP ${res.status}`)
            }

            const data = (await res.json()) as ChatResponse

            const assistantMessage: Message = {
                id: uid(),
                role: 'assistant',
                content: data.answer,
                citations: data.citations ?? [],
                meta: data.meta ?? null,
                createdAt: Date.now()
            }

            setMessages((m) => [...m, assistantMessage])
        } catch (e: any) {
            const assistantError: Message = {
                id: uid(),
                role: 'assistant',
                content: `오류: ${e?.message ?? 'unknown'}`,
                createdAt: Date.now(),
                error: true,
                citations: [],
                meta: null
            }

            setMessages((m) => [...m, assistantError])
        } finally {
            setLoading(false)
            inputRef.current?.focus()
        }
    }

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await send()
    }

    return (
        <main className="max-w-4xl mx-auto w-full p-6">
            <div className="mb-4">
                <h1 className="text-xl font-semibold tracking-tight">RAG Chatbot</h1>
                <p className="text-sm text-gray-500">
                    Ask a question and see grounded sources
                </p>
            </div>

            <div className="flex h-[calc(100vh-220px)] flex-col gap-3">
                <div
                    ref={listRef}
                    className="flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white/70 p-4"
                >
                {messages.length === 0 ? (
                        <div className="text-sm text-gray-500">
                            예: “환불은 어떻게 해요?” / “운영시간 알려줘”
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((m) => (
                                <MessageBubble key={m.id} message={m} />
                            ))}
                        </div>
                    )}
                </div>

                <form
                    onSubmit={onSubmit}
                    className="rounded-2xl border bg-white p-3"
                >
                    <div className="flex items-end gap-2">
            <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="질문을 입력하세요…"
                className="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-200"
                disabled={false}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void send()
                    }
                }}
            />
                        <button
                            type="submit"
                            disabled={loading}
                            className="h-[44px] shrink-0 whitespace-nowrap rounded-xl bg-zinc-800 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
                        >
                        {loading ? '전송중' : '전송'}
                        </button>
                    </div>

                    <div className="mt-2 text-[11px] text-gray-400">
                        Enter: 전송 · Shift+Enter: 줄바꿈
                    </div>
                </form>
            </div>
        </main>
    )
}
