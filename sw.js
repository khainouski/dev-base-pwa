/**
 * Service worker. Сборки нет, файлы статические — поэтому оболочка
 * перечислена руками: после изменения состава файлов нужно поднять VERSION,
 * иначе установленное приложение продолжит отдавать старый кэш.
 *
 * Навигация → сеть, при отсутствии связи — кэшированная оболочка.
 * Свои файлы → кэш, обновляется в фоне.
 * API провайдеров → мимо кэша вообще.
 */

const VERSION = 'v12';
const CACHE = `devbase-${VERSION}`;

/** Документ оболочки кэшируется отдельно, см. precache. */
const SHELL_DOC = './';

const SHELL = [
  './manifest.webmanifest',
  './css/app.css',
  './js/router.js',
  './js/ui.js',
  './js/icons.js',
  './js/markdown.js',
  './js/storage.js',
  './js/ai.js',
  './js/prompts.js',
  './js/pwa.js',
  './js/install.js',
  './js/views/home.js',
  './js/views/folder.js',
  './js/views/page.js',
  './js/views/practice.js',
  './js/views/settings.js',
  './data/content.js',
  './data/md/company/types-concurrency.md',
  './data/md/company/agile.md',
  './data/md/company/team-lead.md',
  './data/md/company/nosql.md',
  './data/md/company/sql.md',
  './data/md/company/rest.md',
  './data/md/company/grpc.md',
  './data/md/company/testing.md',
  './data/md/company/ci-cd.md',
  './data/md/company/microservices.md',
  './data/md/company/live-coding.md',
  './data/md/company/packages.md',
  './data/md/general/general-questions.md',
  './data/md/general/golang.md',
  './data/md/general/python.md',
  './data/md/general/microservices-patterns.md',
  './data/md/general/databases.md',
  './data/md/general/brokers.md',
  './data/md/general/linux-network.md',
  './data/md/general/docker.md',
  './data/md/general/terraform.md',
  './data/md/general/kubernetes.md',
  './data/md/general/observability.md',
  './data/md/general/go-releases.md',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);

  // Хостинг перенаправляет index.html на «/», а перенаправленным ответом
  // нельзя отвечать на навигацию. Поэтому канонический URL кладём сами.
  const res = await fetch(new Request(SHELL_DOC, { cache: 'reload' }));
  if (res.ok && !res.redirected) await cache.put(SHELL_DOC, res);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) {
    // Обновляем в фоне, чтобы следующий запуск получил свежий файл.
    fetch(request).then((res) => {
      if (res.ok && !res.redirected) cache.put(request, res.clone());
    }).catch(() => {});
    return hit;
  }
  const res = await fetch(request);
  if (res.ok && res.type === 'basic' && !res.redirected) cache.put(request, res.clone());
  return res;
}

async function navigate(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE);
    return (await cache.match(SHELL_DOC)) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Anthropic, Google и прочие — мимо кэша.

  if (request.mode === 'navigate') {
    event.respondWith(navigate(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});
