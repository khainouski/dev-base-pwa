/**
 * Единственное место, где приложение ходит в модель.
 *
 * Провайдера два, и оба отвечают JSON: вьюхи получают уже разобранный объект
 * и не знают, кто именно ответил. Добавить третьего — значит дописать сюда
 * один адаптер, не трогая ничего другого.
 *
 * Ключ лежит в localStorage и уходит прямо с браузера в API провайдера.
 * Для личного приложения на своём телефоне это осознанный размен: иначе
 * пришлось бы держать собственный бэкенд. Чужой ключ сюда вводить не стоит.
 */

import { store, findProvider, LEVELS } from './storage.js';

const REQUEST_TIMEOUT_MS = 60000;

export class NoKeyError extends Error {
  constructor() { super('Не задан API-ключ.'); this.name = 'NoKeyError'; }
}

export class AiError extends Error {
  constructor(message, { code = 'unknown', detail = '' } = {}) {
    super(message);
    this.name = 'AiError';
    this.code = code;
    /** Сырой текст ошибки API для диагностики; ключа в нём никогда нет. */
    this.detail = detail;
  }
}

/* ── Системная инструкция ─────────────────────────────────── */

function levelLine(levelId) {
  const level = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
  return level.en;
}

/**
 * Общая роль для всех запросов. Предметная часть («спроси по этой теме»)
 * живёт в js/prompts.js — здесь только то, что верно всегда.
 */
function systemFor(level) {
  return `You are helping a Russian-speaking backend engineer (mainly Go, also Python) prepare for technical interviews: languages and concurrency, databases, microservices, infrastructure, LLM apps, process and team lead questions.
You are given the engineer's own notes for one interview question. Work strictly from them: never contradict the notes, never answer a different question than the one asked.
Calibration: ${levelLine(level)}.
Write everything the learner reads — questions, explanations, verdicts — in Russian. Keep English for terminology, code, flags, file names and API fields; do not translate them.
Be concrete: name the tradeoff, say why the alternatives are worse, and prefer a real production situation over an abstract one.
Return only JSON matching the requested shape. No markdown fences, no commentary around it.`;
}

/* ── Разбор ответа ────────────────────────────────────────── */

/** Модель иногда оборачивает JSON в ```-блок или в пояснение — терпим и это. */
function parseJson(text) {
  const clean = String(text || '').trim();
  if (!clean) throw new AiError('Пустой ответ. Попробуй ещё раз.', { code: 'empty' });
  try {
    return JSON.parse(clean);
  } catch {
    const m = clean.match(/[[{][\s\S]*[\]}]/);
    if (m) { try { return JSON.parse(m[0]); } catch { /* падаем ниже */ } }
    throw new AiError('Не удалось разобрать ответ. Попробуй ещё раз.', { code: 'malformed' });
  }
}

function describeHttpError(status, detail) {
  const lower = String(detail).toLowerCase();

  if (status === 400 && (lower.includes('api key') || lower.includes('credential'))) {
    return new AiError('Неверный API-ключ.', { code: 'bad-key', detail });
  }
  if (status === 400) return new AiError(detail || 'Неверный запрос (400).', { code: 'bad-request', detail });
  if (status === 401 || status === 403) {
    return new AiError('Доступ запрещён. Проверь ключ и его ограничения.', { code: 'auth', detail });
  }
  if (status === 404) return new AiError(detail || 'Модель недоступна. Выбери другую в настройках.', { code: 'no-model', detail });
  if (status === 429) return new AiError('Слишком много запросов (429). Подожди немного.', { code: 'rate-limit', detail });
  if (status >= 500) return new AiError(`AI временно недоступен (${status}). Попробуй ещё раз.`, { code: 'server', detail });
  return new AiError(detail || `Ошибка запроса (${status}).`, { code: 'http', detail });
}

/** Один HTTP-запрос с таймаутом. Разбор ошибок общий для всех провайдеров. */
async function request(url, { headers, body, method = 'POST' }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new AiError(
      controller.signal.aborted
        ? 'AI не ответил за минуту. Попробуй ещё раз.'
        : 'Нет соединения. Проверь интернет.',
      { code: controller.signal.aborted ? 'timeout' : 'network' },
    );
  } finally {
    clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw describeHttpError(response.status, payload?.error?.message || payload?.error?.type || '');
  }
  if (!payload) throw new AiError('Некорректный ответ. Попробуй ещё раз.', { code: 'malformed' });
  return payload;
}

/* ── Адаптеры провайдеров ─────────────────────────────────── */

/**
 * Anthropic Messages API прямо из браузера.
 *
 * `anthropic-dangerous-direct-browser-access` — обязательный заголовок: без
 * него API намеренно отказывает браузеру, чтобы ключ не утёк со страницы.
 * Здесь он уместен: страница своя, ключ свой, бэкенда нет.
 */
const claude = {
  async ask({ key, model, system, prompt, temperature }) {
    const payload = await request('https://api.anthropic.com/v1/messages', {
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: {
        model,
        max_tokens: 8000,
        system,
        // Низкое усилие: вопросы и разборы короткие, глубоко думать тут не над чем.
        output_config: { effort: temperature > 0.5 ? 'medium' : 'low' },
        messages: [{ role: 'user', content: prompt }],
      },
    });

    // Отказ приходит с HTTP 200 — проверяем до того, как читать content.
    if (payload.stop_reason === 'refusal') {
      throw new AiError('Модель отказалась отвечать на этот запрос.', { code: 'refusal' });
    }
    const text = (payload.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return parseJson(text);
  },

  /** Самый дешёвый осмысленный запрос: проверяет и ключ, и модель. */
  async test({ key, model }) {
    await request('https://api.anthropic.com/v1/messages', {
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: { model, max_tokens: 16, messages: [{ role: 'user', content: 'ping' }] },
    });
  },
};

const gemini = {
  /*
   * Начиная с Gemini 3.6 модели думают по умолчанию, и в ответе рядом с JSON
   * бывают части с размышлениями (`thought: true`). Склеенные вместе, они
   * ломали разбор: «Не удалось разобрать ответ». Берём только сам ответ.
   *
   * `temperature` не отправляем: у Gemini 3.6+ параметр устарел, API его
   * игнорирует, а в следующих поколениях обещает за него 400.
   */
  async ask({ key, model, system, prompt }) {
    const payload = await request(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        // Ключ заголовком, а не в URL: так он не попадает в логи и referrer.
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        },
      },
    );

    const cand = payload.candidates?.[0];
    if (!cand) {
      const reason = payload.promptFeedback?.blockReason;
      throw new AiError(
        reason ? `Запрос заблокирован фильтром Gemini (${reason}).` : 'Пустой ответ. Попробуй ещё раз.',
        { code: reason ? 'blocked' : 'empty' },
      );
    }

    const text = (cand.content?.parts || [])
      .filter((p) => !p.thought)
      .map((p) => p.text || '')
      .join('');

    // Обрезанный JSON не разобрать — честнее сказать, почему он обрезан.
    if (cand.finishReason === 'MAX_TOKENS') {
      throw new AiError('Ответ модели оборвался на лимите длины. Попробуй ещё раз или другую модель.', { code: 'truncated' });
    }
    if (cand.finishReason && !['STOP', 'FINISH_REASON_UNSPECIFIED'].includes(cand.finishReason) && !text.trim()) {
      throw new AiError(`Gemini не дал ответа (${cand.finishReason}).`, { code: 'blocked' });
    }

    try {
      return parseJson(text);
    } catch (err) {
      // Сырой ответ — в консоль: по нему видно, что именно пришло не так.
      console.warn('[gemini] не разобран ответ', { model, finishReason: cand.finishReason, text });
      throw err;
    }
  },

  async test({ key, model }) {
    await request(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`,
      { method: 'GET', headers: { 'x-goog-api-key': key } },
    );
  },
};

const ADAPTERS = { claude, gemini };

/* ── Публичный вызов ──────────────────────────────────────── */

/**
 * Задать вопрос текущему провайдеру и получить разобранный JSON.
 *
 * @param {string} prompt    предметная часть запроса, см. js/prompts.js
 * @param {{temperature?: number}} [options]
 */
export async function ask(prompt, { temperature = 0.7 } = {}) {
  const providerId = await store.getProvider();
  const key = await store.getApiKey(providerId);
  if (!key) throw new NoKeyError();

  const model = await store.getModel(providerId);
  const level = await store.getLevel();
  const adapter = ADAPTERS[providerId] || ADAPTERS[findProvider(providerId).id];

  return adapter.ask({ key, model, system: systemFor(level), prompt, temperature });
}

/** Проверка из настроек: работают ли ключ и выбранная модель. */
export async function testKey() {
  const providerId = await store.getProvider();
  const key = await store.getApiKey(providerId);
  if (!key) throw new NoKeyError();
  const model = await store.getModel(providerId);
  await (ADAPTERS[providerId] || claude).test({ key, model });
  return true;
}
