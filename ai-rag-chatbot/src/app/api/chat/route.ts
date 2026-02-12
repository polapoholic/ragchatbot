import { NextResponse } from 'next/server'
import { ragAnswer } from '@/lib/rag'

export const runtime = 'nodejs'

export async function POST(req: Request) {
    const { message } = (await req.json().catch(() => ({}))) as { message?: string }
    const query = (message ?? '').trim()

    if (!query) return NextResponse.json({ error: 'message is required' }, { status: 400 })

    const t0 = Date.now()
    const { answer, citations } = await ragAnswer(query)

    return NextResponse.json(
        {
            answer,
            citations,
            meta: { model: 'rag-keyword', latencyMs: Date.now() - t0 }
        },
        { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    )
}
