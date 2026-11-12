/**
 * Разбор и отрисовка конспектов из `data/md/**.md`.
 *
 * Готовую библиотеку сюда не тащим: зависимостей в проекте нет, а нужен
 * ровно тот поднабор markdown, которым написаны сами заметки — заголовки,
 * списки, таблицы, блоки кода, жирный и `код` в строке.
 *
 * Весь текст проходит через esc(): файлы свои, но HTML внутри них —
 * случайность вроде `<T>` в дженериках, а не разметка, и выглядеть он должен
 * как написан.
 */

import { esc } from './ui.js';

/* ── Строчная разметка ────────────────────────────────────── */

/**
 * Строчная разметка одной строки: `код`, **жирный**, *курсив*, ссылки.
 * `код` вырезается первым и подменяется плашкой: внутри него `**` и `_`
 * должны остаться символами, а не превратиться в жирный.
 */
export function inline(src) {
  const code = [];
  let text = String(src).replace(/`([^`]+)`/g, (_, body) => {
    code.push(body);
    return `\u0000${code.length - 1}\u0000`;
  });

  text = esc(text)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) =>
      (/^(https?:)?\/\//.test(href)
        ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`
        // Внутренние якоря из оглавления никуда не ведут: страница собрана заново.
        : label))
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>');

  return text.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(code[Number(i)])}</code>`);
}

/* ── Блоки ────────────────────────────────────────────────── */

const FENCE = /^\s*```/;
const BULLET = /^(\s*)([*+-]|\d+[.)])\s+(.*)$/;
const TABLE_SEP = /^\s*\|[\s:|-]+\|\s*$/;

const cell = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));

/**
 * Список с вложенностью по отступу. Строка без маркера, но с отступом —
 * продолжение предыдущего пункта: в заметках так дописывают пояснение
 * следующей строкой.
 */
function renderList(items) {
  const ordered = /^\d/.test(items[0].marker);
  const tag = ordered ? 'ol' : 'ul';
  const base = items[0].indent;

  let html = `<${tag}>`;
  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    if (it.indent > base) continue; // вложенные собираются ниже, вместе с родителем

    const nested = [];
    while (i + 1 < items.length && items[i + 1].indent > base) nested.push(items[++i]);

    html += `<li>${it.text.map(inline).join('<br>')}${nested.length ? renderList(nested) : ''}</li>`;
  }
  return `${html}</${tag}>`;
}

/**
 * Markdown одного блока текста в HTML.
 *
 * @param {string} md
 * @returns {string}
 */
export function renderMd(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i += 1; continue; }

    // Блок кода: содержимое не трогаем вообще.
    if (FENCE.test(line)) {
      const lang = line.replace(/^\s*```/, '').trim();
      const body = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i])) body.push(lines[i++]);
      i += 1;
      out.push(`<pre${lang ? ` data-lang="${esc(lang)}"` : ''}><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }

    // Разделитель между вопросами — он же конец блока, рисовать нечего.
    if (/^\s*(---|___|\*\*\*)\s*$/.test(line)) { i += 1; continue; }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    // Таблица: шапка плюс строка-разделитель под ней.
    if (line.trim().startsWith('|') && TABLE_SEP.test(lines[i + 1] || '')) {
      const head = cell(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cell(lines[i++]));
      out.push(`
        <div class="table-scroll"><table>
          <thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>`);
      continue;
    }

    if (BULLET.test(line)) {
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(BULLET);
        if (m) {
          items.push({ indent: m[1].length, marker: m[2], text: [m[3]] });
          i += 1;
        } else if (items.length && /^\s+\S/.test(lines[i])) {
          items[items.length - 1].text.push(lines[i].trim()); // продолжение пункта
          i += 1;
        } else break;
      }
      out.push(renderList(items));
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${renderMd(quote.join('\n'))}</blockquote>`);
      continue;
    }

    // Абзац. Перевод строки внутри абзаца у автора осмысленный (перевод
    // фразы на русский следующей строкой), поэтому сохраняем его как <br>.
    const para = [];
    while (i < lines.length && lines[i].trim()
      && !BULLET.test(lines[i]) && !FENCE.test(lines[i])
      && !/^\s*(#{1,6}\s|>|---|\|)/.test(lines[i])) {
      para.push(lines[i++].trim());
    }
    if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`);
  }

  return out.join('\n');
}

/* ── Структура конспекта ──────────────────────────────────── */

/**
 * Выбросить «Содержание» из файла, который рисуется целиком: ссылки в нём
 * ведут на якоря исходного markdown, которых на собранной странице нет.
 */
export function stripToc(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let skipping = false;
  for (const line of lines) {
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) skipping = h[1].length >= 2 && SKIP_SECTIONS.test(h[2].trim());
    if (!skipping) out.push(line);
  }
  return out.join('\n');
}

/** Служебные разделы: оглавление файла приложение рисует само. */
const SKIP_SECTIONS = /^(содержание|contents( \(en\))?|оглавление)$/i;

/** Заголовок-обёртка вокруг всех вопросов — лишняя строка на экране. */
const PLAIN_SECTIONS = /^(вопросы и ответы|вопросы|questions( and answers)?)$/i;

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60);

/**
 * Конспект → разделы → вопросы.
 *
 * Файлы написаны по одному шаблону: `#` заголовок файла, `## Содержание`
 * (его выбрасываем — навигацию рисует само приложение), `## Раздел` и
 * `### Q1. вопрос` с ответом под ним. Нумерация вопроса бывает и `### 1.`:
 * её тоже снимаем, свой номер приложение всё равно ставит само.
 *
 * Хвост `{gen}` в заголовке вопроса значит, что ответ под ним написан не
 * владельцем, а моделью: страница покажет это пометкой.
 *
 * Файлы без разделов — частый случай, для них заводится один безымянный раздел.
 *
 * @returns {{title: string, sections: {title: string, items: {id: string, n: number, q: string, body: string, generated: boolean}[]}[]}}
 */
export function parseNotes(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');

  const sections = [];
  let title = '';
  let section = null;
  let item = null;
  let skipping = false; // внутри «Содержания»
  let fence = false;
  let n = 0;

  const openSection = (name) => {
    section = { title: name, items: [] };
    sections.push(section);
    item = null;
  };

  for (const line of lines) {
    if (FENCE.test(line)) fence = !fence;

    const h = fence ? null : line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();

      if (level === 1) { title = text; skipping = false; continue; }
      if (level === 2) {
        skipping = SKIP_SECTIONS.test(text);
        if (skipping) { section = null; item = null; continue; }
        openSection(PLAIN_SECTIONS.test(text) ? '' : text);
        continue;
      }
      // level 3 — вопрос
      skipping = false;
      if (!section) openSection('');
      n += 1;
      const generated = /\{gen\}\s*$/i.test(text);
      const q = text.replace(/\{gen\}\s*$/i, '').trim().replace(/^(Q\s*)?\d+[.)]\s*/i, '');
      item = { id: `q${n}-${slug(q)}`, n, q, body: [], generated };
      section.items.push(item);
      continue;
    }

    if (skipping) continue;
    if (item) item.body.push(line);
  }

  for (const s of sections) {
    for (const it of s.items) it.body = it.body.join('\n').replace(/^\s*(---\s*)?\n?/, '').trim();
  }

  return { title, sections: sections.filter((s) => s.items.length) };
}
