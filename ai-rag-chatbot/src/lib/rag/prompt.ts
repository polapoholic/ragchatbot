export function buildContextBlock(
    hits: { doc: { id: string; title: string; content: string }; score: number }[]
) {
    if (hits.length === 0) return '관련 문서를 찾지 못했습니다.'

    return hits
        .map(
            (h, i) =>
                `[#${i + 1}] (${h.doc.id}) ${h.doc.title}\n${h.doc.content}`
        )
        .join('\n\n')
}

export function buildSystemPrompt() {
    return [
        '당신은 고객센터 업무용 챗봇입니다.',
        '반드시 제공된 "문서 컨텍스트" 안에서만 답변하세요.',
        '컨텍스트에 없으면 모른다고 말하고, 어떤 정보가 필요한지 질문하세요.',
        '과장하거나 추측하지 마세요.',
        '마지막에 참고한 문서 id를 "출처:"로 나열하세요.'
    ].join('\n')
}
