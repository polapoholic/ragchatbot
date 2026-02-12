import fs from 'node:fs/promises'
import path from 'node:path'

type Doc = {
    id: string
    title: string
    content: string
}

function tokenize(text: string) {
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter(Boolean)
}

function scoreDoc(queryTokens: string[], doc: Doc) {
    const hay = tokenize(`${doc.title} ${doc.content}`)
    const set = new Set(hay)

    let score = 0
    for (const t of queryTokens) {
        if (set.has(t)) score += 2
    }
    // title 매칭 가중치
    const titleSet = new Set(tokenize(doc.title))
    for (const t of queryTokens) {
        if (titleSet.has(t)) score += 1
    }
    return score
}

export async function retrieveTopK(query: string, k = 3) {
    const filePath = path.join(process.cwd(), 'data', 'faq.json')
    const raw = await fs.readFile(filePath, 'utf-8')
    const docs = JSON.parse(raw) as Doc[]

    const qTokens = tokenize(query)
    const ranked = docs
        .map((d) => ({ doc: d, score: scoreDoc(qTokens, d) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, k)

    return ranked
}
