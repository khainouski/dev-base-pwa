import { findFolder } from '../../data/content.js';
import { crumbs, rowList, esc } from '../ui.js';
import { icon } from '../icons.js';

/** Папка — просто список своих страниц, по порядку конспекта. */
export async function renderFolder(root, folderId) {
  const folder = findFolder(folderId);
  if (!folder) {
    root.innerHTML = '<p class="empty">Такой папки нет. <a href="#/">На главную</a></p>';
    return;
  }

  root.innerHTML = `
    ${crumbs([{ title: 'DevBase', href: '#/' }, { title: folder.title }])}
    <h1 class="page-title">${icon(folder.icon, 'title-icon')}${esc(folder.title)}</h1>
    <p class="page-sub">${esc(folder.sub || '')}</p>

    ${folder.pages.length
    ? rowList(folder.pages.map((p, i) => ({
      href: `#/p/${folder.id}/${p.id}`,
      icon: icon('topic'),
      title: `${i + 1}. ${p.title}`,
      sub: p.sub || '',
    })))
    : '<p class="empty">Здесь пока пусто — страницы появятся позже.</p>'}`;
}
