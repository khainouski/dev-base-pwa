import { ask, NoKeyError } from '../ai.js';
import * as P from '../prompts.js';
import { errorBox, esc, loading } from '../ui.js';
import { renderMd } from '../markdown.js';

/**
 * Две кнопки под каждым вопросом.
 *
 *   «Пример»   — ещё один случай к тому, что уже записано в ответе.
 *   «Уточнить» — свободный вопрос про этот же ответ.
 *
 * Контекстом уходит сам конспект (js/prompts.js), поэтому модель отвечает по
 * записанному, а не вообще. Всё, что она вернула, — недоверенный текст:
 * он рисуется через renderMd(), который экранирует HTML, — так блоки кода
 * от модели выглядят так же, как в самом конспекте, а не сливаются в строку.
 *
 * @param {HTMLElement} slot  пустой контейнер внутри карточки вопроса
 * @param {{page: string, section: string, q: string, body: string}} ctx
 */
export function mountQuestionAi(slot, ctx) {
  slot.innerHTML = `
    <div class="actions q-actions">
      <button class="btn small" data-act="example">Пример</button>
      <button class="btn small" data-act="ask">Уточнить</button>
    </div>
    <div class="q-ask" hidden>
      <textarea class="input" rows="2" placeholder="Напр. «а если индекс составной?»"></textarea>
      <div class="actions" style="margin-top:10px">
        <button class="btn primary small" data-act="send">Спросить</button>
        <span class="muted" style="font-size:13px">⌘/Ctrl + Enter</span>
      </div>
    </div>
    <div class="q-out"></div>`;

  const exampleBtn = slot.querySelector('[data-act="example"]');
  const askBtn = slot.querySelector('[data-act="ask"]');
  const sendBtn = slot.querySelector('[data-act="send"]');
  const askBox = slot.querySelector('.q-ask');
  const field = askBox.querySelector('textarea');
  const out = slot.querySelector('.q-out');

  /** Запрос с подменой подписи кнопки: ответ приходит секунды, кнопка занята. */
  async function run(btn, label, text, prompt, draw) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    out.innerHTML = loading(text);
    try {
      draw(await ask(prompt, { temperature: 0.7 }));
    } catch (err) {
      out.innerHTML = errorBox(err.message, err instanceof NoKeyError);
    }
    btn.disabled = false;
    btn.textContent = label;
  }

  exampleBtn.addEventListener('click', () => run(
    exampleBtn, 'Пример', 'Придумываю пример…', P.examplePrompt(ctx),
    (res) => {
      out.innerHTML = `
        <div class="result-card">
          <div class="gen-item">
            <div class="gen-label">Пример</div>
            <div class="md">${renderMd(res.example || '')}</div>
          </div>
          ${res.why ? `
            <div class="gen-item">
              <div class="gen-label">Что он показывает</div>
              <div class="md">${renderMd(res.why)}</div>
            </div>` : ''}
        </div>`;
    },
  ));

  askBtn.addEventListener('click', () => {
    askBox.hidden = !askBox.hidden;
    askBtn.classList.toggle('active', !askBox.hidden);
    if (!askBox.hidden) field.focus();
  });

  const send = () => {
    const question = field.value.trim();
    if (!question) { field.focus(); return; }
    return run(sendBtn, 'Спросить', 'Читаю конспект…', P.askPrompt(ctx, question), (res) => {
      out.innerHTML = `
        <div class="result-card">
          <div class="gen-item"><div class="md">${renderMd(res.answer || '')}</div></div>
          ${res.example ? `
            <div class="gen-item">
              <div class="gen-label">Пример</div>
              <div class="md">${renderMd(res.example)}</div>
            </div>` : ''}
          ${res.gap ? `
            <div class="gen-item gap">
              <div class="gen-label">За пределами конспекта</div>
              <div class="md">${renderMd(res.gap)}</div>
            </div>` : ''}
        </div>`;
    });
  };

  sendBtn.addEventListener('click', send);
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
  });
}
