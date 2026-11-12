/**
 * Единственный слой хранения: localStorage под префиксом `devbase:`.
 *
 * API асинхронный намеренно — если однажды переедем на IndexedDB или на
 * синхронизацию между устройствами, вызовы во вьюхах менять не придётся.
 */

/**
 * Провайдеры AI. Ключ и модель хранятся отдельно для каждого, так что
 * переключение туда-обратно не стирает уже введённый ключ.
 *
 * `keyHint` и `keyUrl` показываются в настройках — там, где берут ключ.
 */
export const PROVIDERS = [
  {
    id: 'claude',
    label: 'Claude (Anthropic)',
    keyHint: 'sk-ant-…',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-opus-5-5', label: 'сильнее всех, дороже' },
      { id: 'claude-sonnet-5-5', label: 'баланс цены и качества' },
      { id: 'claude-haiku-5-5', label: 'дешёвая и быстрая' },
    ],
  },
  {
    id: 'gemini',
    label: 'Gemini (Google)',
    keyHint: 'AIza…',
    keyUrl: 'https://aistudio.google.com/apikey',
    // Только стабильные модели из списка Google: preview-версии выключают без
    // предупреждения, а несуществующий id даёт 404 на каждом запросе.
    models: [
      { id: 'gemini-3.8-flash', label: 'самая сильная, для примеров кода' },
      { id: 'gemini-3.6-flash', label: 'баланс скорости и качества' },
      { id: 'gemini-3.5-flash-lite', label: 'дешёвая, лимиты выше, слабее в коде' },
    ],
  },
];

/** По умолчанию спрашиваем Claude. */
const DEFAULT_PROVIDER = 'claude';

export const findProvider = (id) =>
  PROVIDERS.find((p) => p.id === id) || PROVIDERS.find((p) => p.id === DEFAULT_PROVIDER);

/**
 * Как объяснять. Влияет только на тон и глубину, не на правильность.
 * «Собеседование» — режим по умолчанию: ответ должен звучать так, как его
 * произносят вслух интервьюеру, а не так, как пишут в учебнике.
 */
export const LEVELS = [
  { id: 'interview', label: 'Как на собеседовании', en: 'answer the way a strong candidate speaks out loud: the point first, then the tradeoff, then one example from production' },
  { id: 'deep', label: 'Разобраться глубже', en: 'assume a senior Go backend engineer; go into mechanics, name the sharp edges and what breaks under load' },
  { id: 'simple', label: 'Объяснить проще', en: 'explain from first principles, unpack every term, prefer a plain analogy over jargon' },
];

const DEFAULT_LEVEL = 'interview';

const PREFIX = 'devbase:';
const KEYS = {
  provider: 'provider',
  level: 'level',
};

const keyFor = (provider) => `key:${provider}`;
const modelFor = (provider) => `model:${provider}`;

/** В приватном режиме Safari запись бросает исключение; приложение продолжает работать. */
function readRaw(key) {
  try { return localStorage.getItem(PREFIX + key); } catch { return null; }
}

function writeRaw(key, value) {
  try { localStorage.setItem(PREFIX + key, value); return true; } catch { return false; }
}

async function get(key, fallback) {
  const raw = readRaw(key);
  if (raw === null) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

async function set(key, value) {
  writeRaw(key, JSON.stringify(value));
}

export const store = {
  /* ── Провайдер, ключ, модель ── */

  async getProvider() {
    const id = await get(KEYS.provider, '');
    return PROVIDERS.some((p) => p.id === id) ? id : DEFAULT_PROVIDER;
  },
  setProvider: (v) => set(KEYS.provider, String(v || '').trim()),

  async getApiKey(provider) {
    const id = provider || (await store.getProvider());
    return get(keyFor(id), '');
  },
  async setApiKey(provider, value) {
    await set(keyFor(provider), String(value || '').trim());
  },

  /** Модель, выпавшая из списка провайдера, откатывается к первой — не к 404. */
  async getModel(provider) {
    const id = provider || (await store.getProvider());
    const p = findProvider(id);
    const chosen = await get(modelFor(id), '');
    return p.models.some((m) => m.id === chosen) ? chosen : p.models[0].id;
  },
  async setModel(provider, value) {
    await set(modelFor(provider), String(value || '').trim());
  },

  async getLevel() {
    const id = await get(KEYS.level, '');
    return LEVELS.some((l) => l.id === id) ? id : DEFAULT_LEVEL;
  },
  setLevel: (v) => set(KEYS.level, String(v || '').trim()),
};
