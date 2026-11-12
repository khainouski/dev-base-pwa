/** Строковые помощники, из которых собираются все экраны. Фреймворка нет. */

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Минимальный markdown: модель выделяет главное **жирным**, код — `бэктиками`. */
export function mdLite(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, '$1<i>$2</i>');
}

/**
 * Ссылка назад, как в телефонном приложении: одна крупная цель с именем того,
 * куда она ведёт. Показывается на любой ширине — запущенное с домашнего
 * экрана приложение не имеет адресной строки, и это единственный выход.
 *
 * href указывает на родителя, но router.js превращает клик в history.back(),
 * если пользователь пришёл изнутри приложения.
 *
 * @param {{title: string, href?: string}[]} items корень → текущий экран
 */
export function crumbs(items) {
  const parent = items[items.length - 2];
  if (!parent) return '';

  const path = items.slice(0, -1)
    .map((it) => `<a href="${it.href}">${esc(it.title)}</a>`)
    .join('<span class="sep">›</span>');

  return `
    <div class="crumbs">
      <a class="back" href="${parent.href}" data-back aria-label="Назад: ${esc(parent.title)}">
        <span class="back-chevron" aria-hidden="true">‹</span>${esc(parent.title)}
      </a>
      ${items.length > 2 ? `<span class="crumbs-path">${path}</span>` : ''}
    </div>`;
}

/**
 * Строка-ссылка сгруппированного списка — паттерн настроек iOS:
 * плитка-иконка, заголовок, подпись, шеврон.
 *
 * @param {{href: string, icon?: string, title: string, sub?: string, meta?: string}[]} items
 */
export function rowList(items) {
  return `<div class="list">${items.map((it) => `
    <a class="row" href="${it.href}">
      ${it.icon ? `<span class="row-icon">${it.icon}</span>` : ''}
      <span class="row-text">
        <span class="row-title">${esc(it.title)}</span>
        ${it.sub ? `<span class="row-sub">${esc(it.sub)}</span>` : ''}
      </span>
      ${it.meta ? `<span class="row-meta">${esc(it.meta)}</span>` : ''}
      <span class="row-chevron" aria-hidden="true">›</span>
    </a>`).join('')}</div>`;
}

export function loading(text = 'Думаю…') {
  return `<div class="loading"><span class="spinner"></span>${esc(text)}</div>`;
}

export function errorBox(message, withSettings = false) {
  const link = withSettings ? '<a href="#/settings">Открыть настройки</a>' : '';
  return `<div class="banner"><span>${esc(message)}</span>${link}</div>`;
}

/** Короткое сообщение поверх интерфейса; исчезает само. */
export function toast(message, ms = 3500) {
  document.querySelector('.toast')?.remove();
  const node = el(`<div class="toast" role="status">${esc(message)}</div>`);
  document.body.appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => node.remove(), 250);
  }, ms);
}

/** Русское склонение после числа: 1 вопрос, 2 вопроса, 5 вопросов. */
export function plural(n, one, few, many) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = n % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

/** Копирование по клику с подтверждением тостом. Clipboard может быть запрещён. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Скопировано');
  } catch {
    toast('Не удалось скопировать');
  }
}
