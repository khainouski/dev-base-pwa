import { FOLDERS, pageCount } from '../../data/content.js';
import { rowList, plural } from '../ui.js';
import { icon } from '../icons.js';

/** Корень — две папки и ничего больше: всё остальное на экран внутри. */
export async function renderHome(root) {
  const n = pageCount();

  root.innerHTML = `
    <h1 class="page-title">DevBase</h1>
    <p class="page-sub">Вопросы к собеседованию и свои ответы — на телефоне.</p>

    ${rowList(FOLDERS.map((f) => ({
    href: `#/f/${f.id}`,
    icon: icon(f.icon) || icon('folder'),
    title: f.title,
    sub: f.sub || '',
    meta: f.pages.length ? String(f.pages.length) : '—',
  })))}

    <p class="hint">${n} ${plural(n, 'страница', 'страницы', 'страниц')} · поиск по <kbd>/</kbd></p>`;
}
