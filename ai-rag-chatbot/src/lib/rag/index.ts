import { retrieveTopK } from './retrieve'

export async function ragAnswer(query: string) {
    const hits = await retrieveTopK(query, 3)

    const citations = hits.map((h) => ({
        id: h.doc.id,
        title: h.doc.title,
        snippet: h.doc.content.slice(0, 120),
        score: h.score
    }))

    // 지금은 규칙 기반(포폴)
    const answer =
        citations.length > 0
            ? `${citations[0].snippet}`
            : '관련 문서를 찾지 못했습니다. 어떤 항목(환불/교환/배송)을 문의하시는지 알려주세요.'

    return { answer, citations }
}
