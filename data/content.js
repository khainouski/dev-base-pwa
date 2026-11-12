/**
 * Оглавление приложения: две папки, внутри — страницы.
 *
 * Сам текст страниц лежит рядом в `data/md/<папка>/<id>.md` — ровно теми
 * файлами, которые владелец пишет для себя. Переносить их в JS-литералы
 * смысла нет: файлы большие, правятся часто, и любой такой перенос означал бы
 * расхождение между конспектом и приложением. Здесь только то, чего в самих
 * файлах нет — как они называются в интерфейсе и в каком порядке идут.
 *
 * `kind: 'doc'` — страница-справочник: она не разбита на вопросы и рисуется
 * одним куском, с общей панелью AI внизу.
 */

export const FOLDERS = [
  {
    id: 'company',
    title: 'Company',
    sub: 'Вопросы под конкретную компанию',
    icon: 'company',
    pages: [
      { id: 'types-concurrency', title: 'Types & Concurrency', sub: 'Типы Go, ловушки, горутины и каналы' },
      { id: 'agile', title: 'Agile, Kanban, Scrum', sub: 'Процесс команды, оценки, церемонии' },
      { id: 'team-lead', title: 'Team Lead Experience', sub: '1:1, делегирование, инциденты' },
      { id: 'nosql', title: 'NoSQL', sub: 'Документные и key-value, консистентность' },
      { id: 'sql', title: 'SQL', sub: 'Индексы, изоляция, транзакции, пул' },
      { id: 'rest', title: 'REST / OpenAPI / Swagger', sub: 'Контракты, версии, коды ответов' },
      { id: 'grpc', title: 'gRPC', sub: 'Protobuf, стримы, сравнение с REST' },
      { id: 'testing', title: 'Testing', sub: 'Юниты, интеграция, моки, флаки' },
      { id: 'ci-cd', title: 'CI/CD', sub: 'Пайплайны, релизы, откаты' },
      { id: 'microservices', title: 'Microservices', sub: 'Границы сервисов, контракты, данные' },
      { id: 'live-coding', title: 'Live coding', sub: 'Свои задачи и типовые с решениями' },
      { id: 'packages', title: 'Пакеты stdlib', sub: 'Справочник по пакетам Go', kind: 'doc' },
    ],
  },
  {
    id: 'general',
    title: 'General',
    sub: 'Общая подготовка к собеседованиям',
    icon: 'general',
    pages: [
      { id: 'general-questions', title: 'Общие вопросы', sub: 'Опыт, команда, процессы, ревью' },
      { id: 'golang', title: 'Golang', sub: 'Строки, слайсы, мапы, каналы, контекст' },
      { id: 'python', title: 'Python', sub: 'Основы, микросервисы, работа с LLM' },
      { id: 'microservices-patterns', title: 'Микросервисы и паттерны', sub: 'Saga, outbox, circuit breaker' },
      { id: 'databases', title: 'Базы данных', sub: 'Транзакции, индексы, MVCC, Mongo' },
      { id: 'brokers', title: 'Брокеры сообщений', sub: 'Kafka, RabbitMQ, гарантии доставки' },
      { id: 'linux-network', title: 'Linux и сеть', sub: 'Процессы, TCP/UDP, HTTP, TLS' },
      { id: 'docker', title: 'Docker', sub: 'Образы, сети, тома, лимиты' },
      { id: 'terraform', title: 'Terraform', sub: 'State, backend, модули, lifecycle' },
      { id: 'kubernetes', title: 'Kubernetes', sub: 'Поды, сервисы, деплойменты, конфиги' },
      { id: 'observability', title: 'Observability', sub: 'Метрики, логи, трейсы, SLO' },
      { id: 'go-releases', title: 'Релизы Go', sub: 'Что нового в последних версиях', kind: 'doc' },
    ],
  },
];

export const findFolder = (id) => FOLDERS.find((f) => f.id === id) || null;

export function findPage(folderId, pageId) {
  const folder = findFolder(folderId);
  const page = folder?.pages.find((p) => p.id === pageId);
  return page ? { folder, page } : null;
}

/** Путь к файлу конспекта. Относительный: приложение живёт и в подкаталоге. */
export const pageFile = (folderId, pageId) => `data/md/${folderId}/${pageId}.md`;

export const pageCount = () => FOLDERS.reduce((n, f) => n + f.pages.length, 0);

/**
 * Файлы читаются по сети один раз и остаются в памяти: страницу открывают
 * по многу раз подряд (вопрос → ответ модели → следующий вопрос), и каждый
 * раз тянуть сотню килобайт незачем. Офлайн их держит service worker.
 */
const cache = new Map();

export async function loadPage(folderId, pageId) {
  const key = `${folderId}/${pageId}`;
  if (cache.has(key)) return cache.get(key);

  const res = await fetch(pageFile(folderId, pageId));
  if (!res.ok) throw new Error(`Не удалось загрузить конспект (${res.status}).`);
  const text = await res.text();
  cache.set(key, text);
  return text;
}
