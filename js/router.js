import { FOLDERS, loadPage } from '../data/content.js';
import { parseNotes } from './markdown.js';
import { renderHome } from './views/home.js';
import { renderFolder } from './views/folder.js';
import { renderPage } from './views/page.js';
import { renderSettings } from './views/settings.js';
import { esc } from './ui.js';
import { icon } from './icons.js';

const app = document.getElementById('app');

function parse() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [, kind, a, b, c] = hash.split('/');
  return {
    kind: kind || '',
    a: a ? decodeURIComponent(a) : '',
    b: b ? decodeURIComponent(b) : '',
    c: c ? decodeURIComponent(c) : '',
  };
}

async function route() {
  const { kind, a, b, c } = parse();
  app.innerHTML = '';
  try {
    switch (kind) {
      case '': await renderHome(app); break;
      case 'f': await renderFolder(app, a); break;
      case 'p': await renderPage(app, a, b, c); break;
      case 'settings': await renderSettings(app); break;
      default: app.innerHTML = '<p class="empty">Страница не найдена. <a href="#/">На главную</a></p>';
    }
  } catch (e) {
    console.error(e);
    app.innerHTML = `<p class="empty">Ошибка отрисовки: ${esc(e.message)}</p>`;
  }
  window.scrollTo(0, 0);
}

/* ── Кнопка «назад» ────────────────────────────────────────── */
/*
 * С домашнего экрана адресной строки нет, и ссылка назад в crumbs() —
 * единственный выход. Вести она должна туда, откуда пришли, а не к родителю
 * в дереве: родителя пользователь мог вообще не открывать.
 *
 * Поэтому нумеруем свои записи истории. Переход по хэш-ссылке создаёт запись
 * без состояния и получает следующий номер; ходьба вперёд-назад восстанавливает
 * проставленный номер. Позиция 0 — точка входа в приложение: оттуда ссылка
 * идёт по своему href, иначе приложение осталось бы позади.
 */
let position = 0;

function trackPosition({ initial = false } = {}) {
  const stamped = history.state?.devbase;
  if (typeof stamped === 'number') {
    position = stamped;
    return;
  }
  position = initial ? 0 : position + 1;
  history.replaceState({ ...history.state, devbase: position }, '');
}

// Перезагрузка сохраняет номер записи — history.state её переживает.
trackPosition({ initial: true });

const canGoBack = () => position > 0;

app.addEventListener('click', (e) => {
  const back = e.target.closest('a[data-back]');
  // Клик с модификатором принадлежит браузеру: открыть в новой вкладке и т. п.
  if (!back || e.defaultPrevented || !canGoBack()) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  history.back();
});

/* ── Поиск по вопросам ─────────────────────────────────────── */
const topbar = document.querySelector('.topbar');
const searchWrap = document.querySelector('.search-wrap');
const searchInput = document.getElementById('search');
const searchResults = document.getElementById('search-results');
const searchToggle = document.getElementById('search-toggle');

searchToggle.innerHTML = icon('search');

/**
 * Индекс строится при первом открытии поиска, а не при загрузке: искать
 * нужно по формулировкам вопросов, а они лежат в файлах конспектов, и
 * тянуть их все ради экрана, на который могут не зайти, незачем.
 */
let index = null;
let indexing = null;

async function buildIndex() {
  const items = [];
  for (const folder of FOLDERS) {
    for (const page of folder.pages) {
      items.push({
        href: `#/p/${folder.id}/${page.id}`,
        title: page.title,
        path: folder.title,
        haystack: `${page.title} ${page.sub || ''}`.toLowerCase(),
      });
      try {
        const text = await loadPage(folder.id, page.id);
        // Справочник на вопросы не разбит — ищем по нему целиком.
        if (page.kind === 'doc') {
          items[items.length - 1].haystack += `\n${text.toLowerCase()}`;
          continue;
        }
        const notes = parseNotes(text);
        for (const s of notes.sections) {
          for (const it of s.items) {
            items.push({
              href: `#/p/${folder.id}/${page.id}/${it.id}`,
              // В выдаче markdown не рисуем: строка узкая, бэктики только мешают.
              title: it.q.replace(/[`*]/g, ''),
              path: [folder.title, page.title].join(' › '),
              haystack: `${it.q}\n${it.body}`.toLowerCase(),
            });
          }
        }
      } catch { /* офлайн и файла нет в кэше — страница просто не попадёт в индекс */ }
    }
  }
  return items;
}

function ensureIndex() {
  if (index || indexing) return indexing;
  indexing = buildIndex().then((items) => { index = items; indexing = null; return items; });
  return indexing;
}

/** Поле открывается лупой и накрывает панель, пока открыто. */
function openSearch() {
  searchWrap.hidden = false;
  topbar.classList.add('searching');
  searchToggle.setAttribute('aria-expanded', 'true');
  searchInput.focus();
  ensureIndex();
}

function hideResults() {
  searchResults.hidden = true;
  searchResults.innerHTML = '';
  activeIdx = -1;
}

function closeSearch() {
  hideResults();
  searchInput.value = '';
  searchWrap.hidden = true;
  topbar.classList.remove('searching');
  searchToggle.setAttribute('aria-expanded', 'false');
}

const searchOpen = () => !searchWrap.hidden;

let activeIdx = -1;

async function runSearch(q) {
  const query = q.trim().toLowerCase();
  if (query.length < 2) { hideResults(); return; }

  if (!index) {
    searchResults.hidden = false;
    searchResults.innerHTML = '<div class="sr-empty">Читаю конспекты…</div>';
    await ensureIndex();
    // Пока читали файлы, в поле могли набрать дальше — отвечаем на последнее.
    if (searchInput.value.trim().toLowerCase() !== query) return;
  }

  const hits = index
    .map((it) => {
      let score = 0;
      if (it.title.toLowerCase().includes(query)) score += 10;
      if (it.haystack.includes(query)) score += 1;
      return { it, score };
    })
    .filter((r) => r.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 12);

  activeIdx = -1;
  searchResults.hidden = false;
  searchResults.innerHTML = hits.length
    ? hits.map((r) => `
      <a href="${esc(r.it.href)}">
        <div>${esc(r.it.title)}</div>
        <div class="sr-path">${esc(r.it.path)}</div>
      </a>`).join('')
    : '<div class="sr-empty">Ничего не найдено</div>';
}

searchToggle.addEventListener('click', () => (searchOpen() ? closeSearch() : openSearch()));
document.getElementById('search-close').addEventListener('click', closeSearch);

searchInput.addEventListener('input', (e) => runSearch(e.target.value));
searchInput.addEventListener('keydown', (e) => {
  const links = [...searchResults.querySelectorAll('a')];
  if (e.key === 'Escape') { closeSearch(); searchInput.blur(); return; }
  if (!links.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    activeIdx = (activeIdx + (e.key === 'ArrowDown' ? 1 : links.length - 1)) % links.length;
    links.forEach((l, i) => l.classList.toggle('active', i === activeIdx));
    links[activeIdx].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    (links[activeIdx] || links[0]).click();
  }
});

searchResults.addEventListener('click', (e) => {
  if (e.target.closest('a')) closeSearch();
});

document.addEventListener('click', (e) => {
  if (searchOpen() && !e.target.closest('.search-wrap') && !e.target.closest('#search-toggle')) {
    closeSearch();
  }
});

document.addEventListener('keydown', (e) => {
  const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
  if (e.key === '/' && !typing) { e.preventDefault(); openSearch(); }
  if (e.key === 'Escape' && !typing && canGoBack()) history.back();
});

window.addEventListener('hashchange', async () => {
  trackPosition();
  await route();
});

route();
