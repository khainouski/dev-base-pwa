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

const noteContext = ({ page, section, q, body }) => `Interview-prep notes of a backend engineer.
Page: ${page}${section ? ` → ${section}` : ''}
Question: ${q}

What the notes say:
${String(body).slice(0, MAX_NOTE)}`;

/* ── Привести пример ──────────────────────────────────────── */

/*
 * Пример уходил в сторону: модель брала код на Go для любого вопроса (в том
 * числе про Scrum и 1:1) и отталкивалась от «дай другой случай, не из
 * конспекта». Теперь она сначала называет утверждение из ответа, которое
 * иллюстрирует (поле `point`), и форму выбирает по теме вопроса. Поле
 * показывается над примером — по нему видно, попал ли пример в вопрос.
 */
export const examplePrompt = (ctx) => `
${noteContext(ctx)}

Task: give ONE example that illustrates THIS question and the answer in the notes — nothing else.

First pick the single most important claim the notes make in answer to the question. The example must demonstrate exactly that claim.

Choose the form by what the question is about:
- a language feature, library or code behaviour → a short code snippet;
- databases and queries → SQL (or the driver call, if the question is about the driver);
- infrastructure (Docker, Kubernetes, Terraform, CI/CD, Linux) → the config file or the command;
- architecture and system design → a concrete scenario with named services and what happens step by step; add code only if it makes the point clearer;
- process, team, leadership, behaviour → a short realistic situation from a team (what happened, what was done, the result), no code.

Code language: the one the question or the page is about (Python page → Python, SQL → SQL, Kubernetes → YAML or kubectl). Go only when the question is about Go or is a language-neutral backend question.

Rules:
- Stay on this question. No neighbouring topics, no generic advice. If the example would fit another question just as well, it is the wrong example.
- Never contradict the notes. You may build on a scenario from the notes, but do not copy an example that is already there.
- Keep it short: code up to ~15 lines, a situation in 3–5 sentences.
- "point": the claim from the notes that the example illustrates, one sentence.
- "example": the example in Markdown. Code goes in a fenced block with the language (\`\`\`go, \`\`\`python, \`\`\`sql, \`\`\`bash, \`\`\`yaml) with real line breaks and indentation; one short sentence before the block may say what it is. Keep code lines under 52 characters — this is read on a phone.
- "why": two or three sentences on how the example shows the point and what goes wrong if it is done differently.

Return JSON: {"point":"...","example":"...","why":"..."}`;

/* ── Уточняющий вопрос ────────────────────────────────────── */

export const askPrompt = (ctx, question) => `
${noteContext(ctx)}

The learner asks: ${question}

Rules:
- Answer from the notes. If the answer goes beyond them, say so plainly in "gap" and answer anyway.
- "answer" is 2–5 sentences. "example" is one concrete case (code, command or situation) or an empty string.
- Both fields are Markdown: **bold** for the key idea, and any code goes in a fenced block with the language and real line breaks, never squeezed into one line.

Return JSON: {"answer":"...","example":"","gap":""}`;
