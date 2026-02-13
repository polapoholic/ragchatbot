'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FaqItem } from './api/chat/faq'
import { FAQ } from './api/chat/faq'

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
    hints?: {
        categories?: string[]
        suggestions?: Array<{ id: string; title: string; tags?: string[] }>
    }
}

type Message = {
    id: string
    role: 'user' | 'assistant'
    content: string
    citations?: Citation[]
    meta?: Meta | null
    createdAt: number
    error?: boolean
    hints?: ChatResponse['hints']
}

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const normalize = (s: string) =>
    s
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .trim()

function buildCategories(faq: FaqItem[]) {
    const map = new Map<string, number>()
    for (const item of faq) {
        for (const t of item.tags ?? []) {
            const key = normalize(t)
            if (!key) continue
            map.set(t, (map.get(t) ?? 0) + 1)
        }
    }
    return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name)
}

function Sources({ citations }: { citations?: Citation[] }) {
    if (!citations || citations.length === 0) return null

    return (
        <details className="mt-2 rounded-xl border border-zinc-200 bg-white/80 p-3">
            <summary className="cursor-pointer text-xs text-zinc-600">
                Sources ({citations.length})
            </summary>

            <div className="mt-3 space-y-2">
                {citations.map((c) => (
                    <div key={c.id} className="rounded-lg bg-zinc-50 p-3 text-xs">
                        <div className="font-medium text-zinc-900">
                            {c.title}{' '}
                            <span className="text-zinc-400 font-normal">({c.id})</span>
                        </div>
                        <div className="mt-1 text-zinc-700 opacity-90">{c.snippet}</div>
                        <div className="mt-1 text-[11px] text-zinc-500">
                            score: {c.score}
                        </div>
                    </div>
                ))}
            </div>
        </details>
    )
}

function Suggestions({
                         hints,
                         onPick
                     }: {
    hints?: ChatResponse['hints']
    onPick: (q: string, mode: 'send' | 'fill') => void
}) {
    const categories = hints?.categories ?? []
    const suggestions = hints?.suggestions ?? []

    if (categories.length === 0 && suggestions.length === 0) return null

    return (
        <div className="mt-2 rounded-xl border border-zinc-200 bg-white/80 p-3">
            <div className="text-xs font-semibold text-zinc-900">추천</div>

            {categories.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                    {categories.slice(0, 6).map((c) => (
                        <span
                            key={c}
                            className="text-xs rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-700"
                        >
              {c}
            </span>
                    ))}
                </div>
            ) : null}

            {suggestions.length > 0 ? (
                <div className="mt-3 grid gap-2">
                    {suggestions.slice(0, 3).map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={(e) => {
                                const mode = e.shiftKey ? 'fill' : 'send'
                                onPick(s.title, mode)
                            }}
                            className="text-left rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
                        >
                            {s.title}
                            {s.tags?.length ? (
                                <div className="mt-1 text-xs text-zinc-500">
                                    {s.tags.join(' · ')}
                                </div>
                            ) : null}
                        </button>
                    ))}
                </div>
            ) : null}

            <div className="mt-2 text-[11px] text-zinc-400">
                클릭: 즉시 전송 · Shift+클릭: 입력만 채우기
            </div>
        </div>
    )
}


function MessageBubble({
                           message,
                           onPick
                       }: {
    message: Message
    onPick: (q: string, mode: 'send' | 'fill') => void
}) {
    const isUser = message.role === 'user'

    const showSuggestions =
        !isUser &&
        (message.citations?.length ?? 0) === 0 &&
        !!message.hints

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%]">
                <div
                    className={`mb-1 text-[11px] font-semibold ${
                        isUser ? 'text-zinc-500 text-right' : 'text-zinc-500'
                    }`}
                >
                    {isUser ? 'You' : 'Assistant'}
                </div>

                <div
                    className={[
                        'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words',
                        isUser
                            ? 'bg-zinc-800 text-zinc-50'
                            : message.error
                                ? 'bg-rose-50 border border-rose-200 text-rose-800'
                                : 'bg-zinc-50 border border-zinc-200 text-zinc-900'
                    ].join(' ')}
                >
                    {message.content || '(빈 응답)'}
                </div>

                {!isUser ? <Sources citations={message.citations} /> : null}

                {showSuggestions ? (
                    <Suggestions hints={message.hints} onPick={onPick} />
                ) : null}

                {!isUser && message.meta ? (
                    <div className="mt-2 text-[11px] text-zinc-400">
                        {message.meta.model} · {message.meta.latencyMs}ms
                    </div>
                ) : null}
            </div>
        </div>
    )
}



function Sidebar({
                     faq,
                     selected,
                     onSelect,
                     onPick
                 }: {
    faq: FaqItem[]
    selected: string | '전체'
    onSelect: (v: string | '전체') => void
    onPick: (q: string, mode: 'send' | 'fill') => void
}) {
    const categories = useMemo(() => buildCategories(faq), [faq])

    const filtered =
        selected === '전체'
            ? faq
            : faq.filter((f) => (f.tags ?? []).includes(selected))

    return (
        <aside className="w-full md:w-80 shrink-0 rounded-2xl border border-zinc-200 bg-white/70 p-4">
            <div className="text-sm font-semibold text-zinc-900">질문 가이드</div>
            <div className="mt-1 text-xs text-zinc-500">
                카테고리를 고르고 예시 질문을 눌러보세요
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => onSelect('전체')}
                    className={`text-xs rounded-full px-3 py-1 border ${
                        selected === '전체'
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                    }`}
                >
                    전체
                </button>

                {categories.map((c) => (
                    <button
                        key={c}
                        type="button"
                        onClick={() => onSelect(c)}
                        className={`text-xs rounded-full px-3 py-1 border ${
                            selected === c
                                ? 'bg-zinc-900 text-white border-zinc-900'
                                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                        }`}
                    >
                        {c}
                    </button>
                ))}
            </div>

            <div className="mt-4 space-y-2">
                {filtered.slice(0, 10).map((f) => (
                    <button
                        key={f.id}
                        type="button"
                        onClick={(e) => {
                            const mode = e.shiftKey ? 'fill' : 'send'
                            onPick(f.title, mode)
                        }}
                        className="w-full text-left rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
                    >
                    {f.title}
                        <div className="mt-1 text-xs text-zinc-500 line-clamp-2">
                            {f.content}
                        </div>
                    </button>
                ))}
            </div>

            <div className="mt-3 text-[11px] text-zinc-400">
                클릭: 즉시 전송 · Shift+클릭: 입력만 채우기
            </div>
        </aside>
    )
}

export default function Home() {
    const inputRef = useRef<HTMLTextAreaElement | null>(null)
    const listRef = useRef<HTMLDivElement | null>(null)

    const [selectedCategory, setSelectedCategory] = useState<string | '전체'>('전체')
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])

    const scrollToBottom = () => {
        const el = listRef.current
        if (!el) return
        el.scrollTop = el.scrollHeight
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages.length])

    const send = async (overrideText?: string) => {
        const raw = typeof overrideText === 'string' ? overrideText : input
        const text = raw.trim()
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
                hints: data.hints,
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

    const headerBadge = useMemo(() => {
        const count = FAQ.length
        return `${count} FAQs`
    }, [])

    return (
        <main className="max-w-6xl mx-auto w-full p-6">
            <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
                        RAG Chatbot
                    </h1>
                    <p className="text-sm text-zinc-500">
                        검색 기반 Q&A · 근거(Sources) 표시
                    </p>
                </div>

                <div className="text-xs rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-600">
                    {headerBadge}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <Sidebar
                    faq={FAQ}
                    selected={selectedCategory}
                    onSelect={setSelectedCategory}
                    onPick={(q, mode) => {
                        if (mode === 'fill') {
                            setInput(q)
                            inputRef.current?.focus()
                            return
                        }

                        void send(q)
                    }}
                />

                <div className="flex-1">
                    <div className="flex h-[calc(100vh-220px)] flex-col gap-3">
                        <div
                            ref={listRef}
                            className="flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white/70 p-4"
                        >
                            {messages.length === 0 ? (
                                <div className="text-sm text-zinc-500">
                                    예시 질문을 왼쪽에서 선택하거나, 직접 질문을 입력해보세요
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {messages.map((m) => (
                                        <MessageBubble
                                            key={m.id}
                                            message={m}
                                            onPick={(q, mode) => {
                                                if (mode === 'fill') {
                                                    setInput(q)
                                                    inputRef.current?.focus()
                                                    return
                                                }
                                                void send(q)
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <form onSubmit={onSubmit} className="rounded-2xl border border-zinc-200 bg-white p-3">
                            <div className="flex items-end gap-2">
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="질문을 입력하세요…"
                    className="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-200"
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

                            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
                                <span>Enter: 전송 · Shift+Enter: 줄바꿈</span>
                                <span className="hidden sm:inline">
                  현재 카테고리: {selectedCategory}
                </span>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </main>
    )
}
