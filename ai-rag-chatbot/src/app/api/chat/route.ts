import { NextResponse } from 'next/server'
import { FAQ } from './faq'

const normalize = (s: string) =>
    s
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .trim()

const tokenize = (s: string) =>
    normalize(s)
        .split(' ')
        .filter(Boolean)

const scoreItem = (qTokens: string[], text: string) => {
    const t = normalize(text)
    let score = 0
    for (const tok of qTokens) {
        if (tok.length < 2) continue
        if (t.includes(tok)) score += 1
    }
    return score
}

export async function POST(req: Request) {
    const { message } = (await req.json()) as { message?: string }
    const q = (message ?? '').trim()
    if (!q) return NextResponse.json({ answer: '질문이 비어있습니다.', citations: [], meta: { model: 'local', latencyMs: 0 } })

    const t0 = Date.now()
    const qTokens = tokenize(q)

    const ranked = FAQ
        .map((item) => {
            const s1 = scoreItem(qTokens, item.title) * 2
            const s2 = scoreItem(qTokens, item.content)
            return { item, score: s1 + s2 }
        })
        .sort((a, b) => b.score - a.score)

    const top = ranked[0]
    const latencyMs = Date.now() - t0

    if (!top || top.score <= 0) {
        const suggestions = FAQ.slice(0, 6).map((f) => ({
            id: f.id,
            title: f.title,
            tags: f.tags ?? []
        }))

        return NextResponse.json({
            answer: '관련 문서를 찾지 못했습니다.',
            citations: [],
            meta: { model: 'local-search', latencyMs },
            hints: {
                categories: ['계정', '결제', '배송', '고객센터', '오류'],
                suggestions
            }
        })
    }

    return NextResponse.json({
        answer: top.item.content,
        citations: [
            {
                id: top.item.id,
                title: top.item.title,
                snippet: top.item.content,
                score: top.score
            }
        ],
        meta: { model: 'local-search', latencyMs }
    })
}
