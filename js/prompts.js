/**
 * Все промпты приложения. Новый AI-режим добавляется сюда, а не в вид.
 *
 * Контекстом всегда уходит сам конспект — вопрос и записанный под ним ответ.
 * Это главное правило: модель объясняет то, что у владельца записано, а не
 * то, что она думает про предмет вообще. Формат JSON описан текстом прямо в
 * промпте: он должен совпадать с тем, как вид потом читает поля.
 */

/**
 * Длинный ответ режем: дальше идут таблицы и примеры, которые для «приведи
 * ещё один пример» ничего не добавляют, а токены стоят денег.
 */
const MAX_NOTE = 6000;

const noteContext = ({ page, section, q, body }) => `Study notes of a Go backend engineer preparing for interviews.
Page: ${page}${section ? ` → ${section}` : ''}
Question: ${q}

What the notes say:
${String(body).slice(0, MAX_NOTE)}`;

/* ── Привести пример ──────────────────────────────────────── */

export const examplePrompt = (ctx) => `
${noteContext(ctx)}

Give ONE concrete example that makes this answer land: real code (Go unless the question is about something else), a real command, or a short real situation from a production system — whichever fits the question.

Rules:
- Do not repeat an example already written in the notes: give a different case.
- Stay inside what the notes claim; never contradict them.
- "example": the example itself, in Markdown. Put any code in a fenced block with the language (\`\`\`go, \`\`\`sql, \`\`\`bash, \`\`\`yaml) and keep real line breaks and indentation; one short sentence before the block may say what it is. Keep code lines under 52 characters — this is read on a phone.
- "why": two or three sentences on what exactly the example shows and what breaks if you do it the other way.

Return JSON: {"example":"...","why":"..."}`;

/* ── Уточняющий вопрос ────────────────────────────────────── */

export const askPrompt = (ctx, question) => `
${noteContext(ctx)}

The learner asks: ${question}

Rules:
- Answer from the notes. If the answer goes beyond them, say so plainly in "gap" and answer anyway.
- "answer" is 2–5 sentences. "example" is one concrete case (code, command or situation) or an empty string.
- Both fields are Markdown: **bold** for the key idea, and any code goes in a fenced block with the language and real line breaks, never squeezed into one line.

Return JSON: {"answer":"...","example":"","gap":""}`;
