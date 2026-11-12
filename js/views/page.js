import { findPage, loadPage } from '../../data/content.js';
import { inline, parseNotes, renderMd, stripToc } from '../markdown.js';
import { crumbs, esc, loading, plural } from '../ui.js';
import { mountQuestionAi } from './practice.js';

/**
 * Страница конспекта: вопросы списком, ответ раскрывается по нажатию.
 *
 * Свёрнутый вид — не экономия места, а сам смысл: сначала вспомнить ответ,
 * потом развернуть и свериться. Под каждым ответом — две кнопки к модели.
 *
 * Ответ рисуется один раз при первом раскрытии: конспекты большие, и класть
 * в DOM сразу все таблицы и блоки кода незачем.
 *
 * `focusId` приходит из поиска: найденный вопрос сразу раскрыт и подкручен
 * к верху экрана.
 */
export async function renderPage(root, folderId, pageId, focusId = '') {
  const found = findPage(folderId, pageId);
  if (!found) {
    root.innerHTML = '<p class="empty">Такой страницы нет. <a href="#/">На главную</a></p>';
    return;
  }
  const { folder, page } = found;

  const head = `
    ${crumbs([
    { title: 'DevBase', href: '#/' },
    { title: folder.title, href: `#/f/${folder.id}` },
    { title: page.title },
  ])}
    <h1 class="page-title">${esc(page.title)}</h1>`;

  root.innerHTML = `${head}<div class="result-card">${loading('Открываю конспект…')}</div>`;

  let text;
  try {
    text = await loadPage(folder.id, page.id);
  } catch (e) {
    root.innerHTML = `${head}<p class="empty">${esc(e.message)}</p>`;
    return;
  }

  if (page.kind === 'doc') { renderDoc(root, head, page, text); return; }

  const notes = parseNotes(text);
  // Заголовок файла, повторяющий название страницы, подзаголовком не ставим.
  const sub = notes.title && notes.title !== page.title ? notes.title : (page.sub || '');
  const total = notes.sections.reduce((n, s) => n + s.items.length, 0);

  root.innerHTML = `
    ${head}
    <p class="page-sub">${esc(sub)}</p>
    <p class="hint qa-count">${total} ${plural(total, 'вопрос', 'вопроса', 'вопросов')}</p>

    ${notes.sections.map((s) => `
      ${s.title ? `<div class="section-title">${esc(s.title)}</div>` : ''}
      <div class="qa">
        ${s.items.map((it) => `
          <details class="qa-item" data-q="${esc(it.id)}">
            <summary>
              <span class="qa-n">Q${it.n}</span>
              <span class="qa-q">${inline(it.q)}</span>
              ${it.generated ? '<span class="qa-gen" title="Ответ написан моделью, а не из конспекта">AI</span>' : ''}
            </summary>
            <div class="qa-answer md"></div>
            <div class="qa-ai"></div>
          </details>`).join('')}
      </div>`).join('')}`;

  const byId = new Map();
  for (const s of notes.sections) for (const it of s.items) byId.set(it.id, { section: s.title, item: it });

  root.querySelectorAll('.qa-item').forEach((node) => {
    node.addEventListener('toggle', () => {
      if (!node.open || node.dataset.ready) return;
      node.dataset.ready = '1';

      const { section, item } = byId.get(node.dataset.q);
      node.querySelector('.qa-answer').innerHTML = item.body
        ? `${item.generated ? '<p class="gen-note">Ответ написан моделью, не владельцем конспекта.</p>' : ''}${renderMd(item.body)}`
        : '<p class="muted">Ответ пока не написан — спроси модель кнопками ниже.</p>';

      mountQuestionAi(node.querySelector('.qa-ai'), {
        page: page.title,
        section,
        q: item.q,
        body: item.body,
      });
    });
  });

  if (!focusId) return;
  const target = root.querySelector(`.qa-item[data-q="${CSS.escape(focusId)}"]`);
  if (!target) return;
  target.open = true;
  // Роутер сам крутит страницу вверх сразу после отрисовки — отсюда позже.
  setTimeout(() => target.scrollIntoView({ block: 'start' }), 0);
}

/*
 * Страница-справочник (пакеты stdlib, релизы Go): вопросов в ней нет, резать
 * её на карточки не по чему. Рисуем целиком, панель AI — одна, на всю страницу.
 */
function renderDoc(root, head, page, text) {
  root.innerHTML = `
    ${head}
    <p class="page-sub">${esc(page.sub || '')}</p>
    <div class="md doc">${renderMd(stripToc(text))}</div>
    <div class="qa-ai doc-ai"></div>`;

  mountQuestionAi(root.querySelector('.doc-ai'), {
    page: page.title,
    section: '',
    q: page.title,
    body: text,
  });
}
