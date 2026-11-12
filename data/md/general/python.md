# Python

## Типы и структуры данных

### 1. Изменяемые и неизменяемые типы. Какие есть и почему это важно? {gen}

* **Неизменяемые (immutable):** `int`, `float`, `bool`, `str`, `tuple`, `frozenset`, `bytes`, `None`. Изменить объект нельзя — любая «правка» создаёт новый объект.
* **Изменяемые (mutable):** `list`, `dict`, `set`, `bytearray`, объекты обычных классов.

**Почему важно:**
* ключом `dict` и элементом `set` может быть только хэшируемый (как правило, неизменяемый) объект;
* изменяемый объект, переданный в функцию, можно поменять изнутри — изменение увидит вызывающий код.

```python
s = "abc"
s2 = s.upper()   # новый объект, s не изменилась

a = [1, 2]
b = a
b.append(3)
print(a)         # [1, 2, 3] — это один и тот же список
```

---

### 2. Чем отличаются list, tuple, set и dict? {gen}

| | list | tuple | set | dict |
|---|---|---|---|---|
| Изменяемый | да | нет | да | да |
| Порядок | есть | есть | нет | есть (с 3.7) |
| Дубли | да | да | нет | ключи уникальны |
| Поиск `x in` | O(n) | O(n) | O(1) | O(1) по ключу |
| Пример | `[1, 2]` | `(1, 2)` | `{1, 2}` | `{"a": 1}` |

Когда что:
* **list** — упорядоченная коллекция, которую меняем;
* **tuple** — фиксированная запись (координаты, возврат нескольких значений), может быть ключом словаря;
* **set** — уникальные значения и быстрая проверка «есть ли»;
* **dict** — поиск по ключу.

Ловушка: `{}` — это пустой **dict**, пустой set создаётся как `set()`.

---

### 3. Как устроен dict? Что может быть ключом? {gen}

`dict` — **хэш-таблица**. По ключу считается `hash()`, по хэшу находится ячейка. Поэтому поиск, вставка и удаление в среднем за `O(1)`.

**Ключом может быть только хэшируемый объект** — у него есть `__hash__`, и хэш не меняется за время жизни: `int`, `str`, `tuple` из неизменяемых элементов, `frozenset`. `list`, `dict`, `set` — нельзя.

```python
d = {(1, 2): "точка"}   # tuple — можно
d[[1, 2]] = "x"         # TypeError: unhashable type: 'list'
```

С Python 3.7 `dict` **сохраняет порядок вставки** (это гарантия языка). Если два ключа равны (`1 == 1.0`), это один и тот же ключ.

---

### 4. Чем отличается `is` от `==`? {gen}

* `==` — **равенство значений** (вызывает `__eq__`).
* `is` — **один и тот же объект** в памяти (сравнивает `id()`).

```python
a = [1, 2]
b = [1, 2]
a == b   # True — значения равны
a is b   # False — разные объекты
```

Правило: `is` используют только для синглтонов — `x is None`, `x is True`. Для чисел и строк `is` может случайно дать `True` из-за кэширования малых чисел (-5…256) и интернирования строк — на это нельзя полагаться.

---

### 5. Строки неизменяемы — как эффективно склеить много строк? {gen}

`s += part` в цикле каждый раз создаёт новую строку и копирует старую — в худшем случае `O(n²)`.

Правильно — собрать части в список и склеить один раз через `join`:

```python
parts = []
for i in range(100_000):
    parts.append(str(i))
result = "".join(parts)

# или короче
result = "".join(str(i) for i in range(100_000))
```

Для форматирования — f-строки: `f"{name}: {value:.2f}"`.

## Функции

### 6. Почему опасен изменяемый аргумент по умолчанию? {gen}

Значение по умолчанию вычисляется **один раз — при определении функции**, а не при каждом вызове. Изменяемый объект становится общим для всех вызовов.

```python
def add(item, items=[]):
    items.append(item)
    return items

add(1)   # [1]
add(2)   # [1, 2] — список тот же!
```

**Как правильно** — `None` и создание объекта внутри:

```python
def add(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

---

### 7. Что такое `*args` и `**kwargs`? {gen}

* `*args` — собирает лишние **позиционные** аргументы в `tuple`.
* `**kwargs` — собирает лишние **именованные** аргументы в `dict`.

```python
def f(a, *args, **kwargs):
    print(a, args, kwargs)

f(1, 2, 3, x=4)   # 1 (2, 3) {'x': 4}
```

Те же звёздочки при вызове **распаковывают**:

```python
nums = [1, 2, 3]
opts = {"sep": "-"}
print(*nums, **opts)   # 1-2-3
```

Часто используется в декораторах, чтобы передать любые аргументы дальше.

---

### 8. Как передаются аргументы в функцию: по ссылке или по значению? {gen}

Ни то, ни другое — **по ссылке на объект** (call by object reference / call by sharing). Функция получает ссылку на тот же объект.

* Если объект **изменяемый** и функция его **меняет** — изменение видно снаружи.
* Если функция **переприсваивает** параметр — снаружи ничего не меняется: параметр просто начинает указывать на другой объект.

```python
def change(lst):
    lst.append(4)     # меняем объект — видно снаружи
    lst = [0]         # переприсвоили имя — снаружи не видно

a = [1, 2, 3]
change(a)
print(a)              # [1, 2, 3, 4]
```

---

### 9. Что такое области видимости (LEGB), `global` и `nonlocal`? Что такое замыкание? {gen}

Имя ищется по порядку **LEGB**:
* **L**ocal — внутри функции;
* **E**nclosing — во внешней функции;
* **G**lobal — на уровне модуля;
* **B**uilt-in — встроенные (`len`, `print`).

Присваивание внутри функции создаёт локальную переменную. Чтобы изменить внешнюю:
* `global x` — переменную модуля;
* `nonlocal x` — переменную внешней функции.

**Замыкание** — внутренняя функция, которая запомнила переменные внешней функции даже после её завершения.

```python
def counter():
    count = 0
    def inc():
        nonlocal count
        count += 1
        return count
    return inc

c = counter()
c(); c()
print(c())   # 3
```

---

### 10. Что такое lambda, map, filter и reduce? {gen}

* **lambda** — анонимная функция из одного выражения: `lambda x: x * 2`.
* **map(f, it)** — применяет `f` к каждому элементу.
* **filter(f, it)** — оставляет элементы, где `f` вернула истину.
* **reduce(f, it)** (из `functools`) — сворачивает последовательность в одно значение.

```python
from functools import reduce

nums = [1, 2, 3, 4]
list(map(lambda x: x * 2, nums))         # [2, 4, 6, 8]
list(filter(lambda x: x % 2 == 0, nums)) # [2, 4]
reduce(lambda a, b: a + b, nums)         # 10
```

В Python обычно читаемее comprehension: `[x * 2 for x in nums]`, `[x for x in nums if x % 2 == 0]`, `sum(nums)`. `lambda` хороша как короткий ключ: `sorted(users, key=lambda u: u.age)`.

---

### 11. Что такое декоратор? Как написать свой? {gen}

**Декоратор** — функция, которая принимает функцию и возвращает новую, добавляя поведение до или после вызова. Запись `@decorator` — это просто `f = decorator(f)`.

```python
import functools
import time

def timer(func):
    @functools.wraps(func)          # сохраняет имя и docstring
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        print(f"{func.__name__}: {time.perf_counter() - start:.3f}s")
        return result
    return wrapper

@timer
def work():
    time.sleep(0.1)
```

Применение: логирование, замер времени, кэш (`@functools.cache`), ретраи, проверка прав, роуты во фреймворках (`@app.get("/")`).

## Итераторы и генераторы

### 12. Что такое comprehension и generator expression? {gen}

**Comprehension** — короткая запись создания коллекции из другой:

```python
squares = [x * x for x in range(10)]          # list
evens   = {x for x in range(10) if x % 2 == 0} # set
index   = {name: i for i, name in enumerate(names)}  # dict
```

**Generator expression** — то же в круглых скобках, но **ленивое**: значения считаются по одному по мере запроса и не хранятся в памяти целиком.

```python
total = sum(x * x for x in range(10_000_000))  # память почти не растёт
```

Правило: нужен результат несколько раз или по индексу — list; нужно один раз пройти большой поток — генератор.

---

### 13. Чем итератор отличается от генератора? Что делает `yield`? {gen}

* **Итерируемый объект** (iterable) — то, по чему можно пройти `for`: у него есть `__iter__` (list, str, dict).
* **Итератор** — объект с `__next__`, который выдаёт элементы по одному и бросает `StopIteration` в конце. Проходится **один раз**.
* **Генератор** — самый простой способ написать итератор: функция с `yield`. При каждом `next()` она выполняется до следующего `yield` и **замораживается**, сохраняя состояние.

```python
def countdown(n):
    while n > 0:
        yield n
        n -= 1

gen = countdown(3)
next(gen)        # 3
list(gen)        # [2, 1] — продолжил с места остановки
list(gen)        # [] — генератор исчерпан
```

Плюс генераторов — ленивость: можно обрабатывать огромные файлы и бесконечные последовательности, не загружая всё в память.

---

### 14. Что такое контекстный менеджер и `with`? {gen}

**Контекстный менеджер** гарантирует, что ресурс будет освобождён, даже если внутри блока произошла ошибка. `with` вызывает `__enter__` в начале и `__exit__` в конце.

```python
with open("data.txt") as f:
    data = f.read()
# файл закрыт, даже если read() упал
```

Свой — через класс с `__enter__`/`__exit__` или проще через `contextlib`:

```python
from contextlib import contextmanager

@contextmanager
def transaction(conn):
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
```

Применение: файлы, соединения с БД, транзакции, блокировки (`with lock:`), временная смена настроек.

---

### 15. Чем отличается поверхностная копия от глубокой? {gen}

* **Присваивание** `b = a` — не копия, а второе имя для того же объекта.
* **Поверхностная копия** (`copy.copy`, `list(a)`, `a[:]`, `a.copy()`) — новый внешний объект, но **вложенные объекты общие**.
* **Глубокая копия** (`copy.deepcopy`) — рекурсивно копирует всё.

```python
import copy

a = [[1, 2], [3]]
shallow = copy.copy(a)
deep = copy.deepcopy(a)

a[0].append(99)
print(shallow)   # [[1, 2, 99], [3]] — вложенный список общий
print(deep)      # [[1, 2], [3]]
```

## ООП

### 16. Как устроены классы: `__init__`, `self`, наследование, `super()`, MRO? {gen}

* `__init__` — инициализирует уже созданный объект (сам объект создаёт `__new__`).
* `self` — ссылка на текущий экземпляр; передаётся явно первым параметром.
* **Наследование** — класс получает атрибуты и методы родителя и может их переопределить.
* `super()` — вызов метода родителя.
* **MRO** (Method Resolution Order) — порядок поиска метода при множественном наследовании (алгоритм C3). Посмотреть: `Class.__mro__`.

```python
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return "..."

class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name)
        self.breed = breed

    def speak(self):
        return "Гав"
```

В Python нет настоящих приватных полей: `_x` — договорённость «не трогать», `__x` — искажение имени (name mangling), чтобы не конфликтовать с наследниками.

---

### 17. Чем отличаются `@staticmethod`, `@classmethod` и `@property`? {gen}

* **обычный метод** — получает экземпляр `self`.
* **`@classmethod`** — получает **класс** `cls`. Типичное применение — альтернативные конструкторы.
* **`@staticmethod`** — не получает ни экземпляр, ни класс; обычная функция, положенная в класс по смыслу.
* **`@property`** — метод, к которому обращаются как к атрибуту; можно добавить проверку при записи.

```python
class User:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    @classmethod
    def from_dict(cls, d):
        return cls(d["name"], d["age"])

    @staticmethod
    def is_valid_age(age):
        return 0 <= age <= 150

    @property
    def age(self):
        return self._age

    @age.setter
    def age(self, value):
        if not self.is_valid_age(value):
            raise ValueError("bad age")
        self._age = value
```

---

### 18. Какие магические (dunder) методы знаешь? {gen}

Методы с двойным подчёркиванием, через которые объект встраивается в синтаксис языка:

* **создание:** `__new__` (создаёт объект), `__init__` (инициализирует);
* **строки:** `__str__` — для людей (`print`), `__repr__` — для разработчика (отладка, консоль);
* **сравнение:** `__eq__`, `__lt__` и др., `__hash__`;
* **коллекции:** `__len__`, `__getitem__`, `__contains__` (`in`), `__iter__`;
* **операторы:** `__add__`, `__mul__`;
* **вызов:** `__call__` — объект можно вызывать как функцию;
* **контекст:** `__enter__`, `__exit__`.

```python
class Money:
    def __init__(self, amount):
        self.amount = amount

    def __add__(self, other):
        return Money(self.amount + other.amount)

    def __repr__(self):
        return f"Money({self.amount})"

print(Money(5) + Money(3))   # Money(8)
```

Важно: если переопределили `__eq__`, объект становится нехэшируемым, пока не определите `__hash__`.

---

### 19. Что такое dataclass? {gen}

`@dataclass` генерирует `__init__`, `__repr__` и `__eq__` по аннотациям полей — меньше шаблонного кода для классов-«контейнеров данных».

```python
from dataclasses import dataclass, field

@dataclass
class User:
    name: str
    age: int = 0
    tags: list[str] = field(default_factory=list)  # не []!

u = User("Ann", 30)
print(u)   # User(name='Ann', age=30, tags=[])
```

Полезные параметры: `frozen=True` (неизменяемый и хэшируемый), `order=True` (сравнение `<`), `slots=True` (меньше памяти). Для валидации данных из внешнего мира часто берут **Pydantic**.

---

### 20. Что такое утиная типизация и type hints? {gen}

**Утиная типизация:** «если крякает как утка — это утка». Важен не тип объекта, а то, что у него есть нужные методы. Функция, которая вызывает `.read()`, примет и файл, и `StringIO`, и свой класс.

**Type hints** — аннотации типов. Python их **не проверяет при выполнении**, они нужны для IDE и статических анализаторов (`mypy`, `pyright`).

```python
def greet(name: str, times: int = 1) -> str:
    return f"Hi, {name}! " * times

def first(items: list[int]) -> int | None:
    return items[0] if items else None
```

Для утиной типизации с проверкой типов есть `typing.Protocol` — описывает нужные методы без наследования.

## Исключения

### 21. Как работают исключения: try / except / else / finally? Как сделать своё? {gen}

```python
try:
    value = int(text)
except ValueError as e:
    print("не число:", e)       # если ошибка
else:
    print("успех:", value)      # если ошибки НЕ было
finally:
    print("выполнится всегда")  # закрыть ресурсы
```

Правила:
* ловить **конкретные** исключения, а не голый `except:` — он ловит даже `KeyboardInterrupt` и `SystemExit`;
* `raise` без аргумента внутри `except` пробрасывает ту же ошибку дальше;
* `raise NewError(...) from e` — сохраняет исходную причину.

Своё исключение — наследник `Exception`:

```python
class InsufficientFunds(Exception):
    def __init__(self, need: int):
        super().__init__(f"не хватает {need}")
        self.need = need
```

## Конкурентность и память

### 22. Что такое GIL и как он влияет на программы? {gen}

**GIL** (Global Interpreter Lock) — глобальная блокировка в CPython: в один момент времени байт-код Python выполняет **только один поток**. Нужен, чтобы подсчёт ссылок на объекты был потокобезопасным.

**Как влияет:**
* **CPU-bound** задачи (вычисления) потоки **не ускоряют** — работает всё равно одно ядро;
* **I/O-bound** задачи (сеть, диск, БД) потоки **ускоряют**: во время ожидания I/O поток отпускает GIL;
* C-расширения (NumPy) могут отпускать GIL на тяжёлых вычислениях.

**Как обойти для CPU-задач:** `multiprocessing` (отдельные процессы, у каждого свой GIL), вынести тяжёлое в C/Rust.

В 3.13 появилась экспериментальная сборка CPython без GIL (free-threaded), в 3.14 она официально поддерживается, но по умолчанию GIL по-прежнему есть.

---

### 23. Чем отличаются threading, multiprocessing и asyncio? Когда что? {gen}

| | threading | multiprocessing | asyncio |
|---|---|---|---|
| Что это | потоки ОС в одном процессе | отдельные процессы | одна нить + event loop |
| Память | общая | у каждого своя | общая |
| GIL | мешает CPU-задачам | не мешает | не важен |
| Для чего | I/O-bound | **CPU-bound** | **много** I/O одновременно |
| Накладные расходы | средние | высокие | низкие |

* **threading** — немного параллельных I/O-операций, блокирующие библиотеки.
* **multiprocessing** — тяжёлые вычисления на всех ядрах.
* **asyncio** — тысячи одновременных сетевых соединений (веб-сервер, краулер).

Удобная обёртка над первыми двумя — `concurrent.futures`:

```python
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=10) as pool:
    results = list(pool.map(download, urls))
```

---

### 24. Как работают async/await и event loop? {gen}

* `async def` объявляет **корутину** — функцию, которую можно приостановить.
* `await` приостанавливает корутину, пока не будет готов результат (ответ сети, таймер), и **отдаёт управление** event loop.
* **Event loop** — в одном потоке переключается между корутинами, пока они ждут I/O. Поэтому тысячи соединений обслуживаются без тысяч потоков.

```python
import asyncio

async def fetch(i):
    await asyncio.sleep(1)      # имитация сетевого запроса
    return i

async def main():
    results = await asyncio.gather(*(fetch(i) for i in range(100)))
    print(len(results))         # 100 за ~1 секунду, а не за 100

asyncio.run(main())
```

Главная ловушка: **блокирующий вызов** внутри корутины (`time.sleep`, `requests.get`, тяжёлые вычисления) останавливает весь event loop. Нужны async-библиотеки (`httpx`, `aiohttp`, `asyncpg`) или `asyncio.to_thread(...)`.

---

### 25. Как Python управляет памятью? {gen}

* **Подсчёт ссылок** (reference counting) — основной механизм. У каждого объекта есть счётчик ссылок; когда он становится 0, объект удаляется **сразу**.
* **Сборщик мусора** (модуль `gc`) — дополнительно находит **циклические ссылки** (A ссылается на B, B на A), которые подсчёт ссылок не видит. Работает по поколениям: молодые объекты проверяются чаще.
* Мелкие объекты выделяются из собственного аллокатора CPython (pymalloc) — быстрее, чем каждый раз просить память у ОС.

```python
import sys
a = []
sys.getrefcount(a)   # 2: переменная a + аргумент функции
```

Утечки в Python обычно — это не «потерянная» память, а ссылки, которые где-то держатся: глобальные кэши, списки, которые только растут, замыкания. Искать — `tracemalloc`.

## Практика

### 26. Что значит `if __name__ == "__main__":`? {gen}

У каждого модуля есть переменная `__name__`:
* если файл **запущен напрямую** (`python app.py`) — `__name__ == "__main__"`;
* если файл **импортирован** — `__name__` равен имени модуля.

```python
def main():
    print("запуск")

if __name__ == "__main__":
    main()   # выполнится только при прямом запуске, не при import
```

Так один файл работает и как скрипт, и как модуль, который можно импортировать (например, в тестах), не запуская побочных действий.

---

### 27. Как управлять зависимостями и окружениями? {gen}

**Виртуальное окружение** — изолированная папка со своим интерпретатором и пакетами, чтобы зависимости разных проектов не конфликтовали.

```bash
python -m venv .venv
source .venv/bin/activate
pip install requests
pip freeze > requirements.txt
pip install -r requirements.txt
```

Современные инструменты:
* **uv** — очень быстрый менеджер пакетов и окружений (замена pip + venv);
* **Poetry** — зависимости и lock-файл, сборка пакетов;
* **pyproject.toml** — стандартный файл описания проекта и зависимостей.

Главное — **lock-файл** с точными версиями, чтобы окружение одинаково собиралось у всех и в CI.

## Коллекции, сложность и тесты

### 28. Какая сложность у основных операций со списком, словарём и множеством? {gen}

| Операция | list | dict / set |
|---|---|---|
| Доступ по индексу / ключу | `O(1)` | `O(1)` |
| `x in ...` | `O(n)` | `O(1)` |
| Добавить в конец (`append`) | `O(1)` амортизированно | `O(1)` |
| Вставить / удалить в начале (`insert(0, x)`, `pop(0)`) | `O(n)` — сдвиг всех элементов | — |
| Удалить с конца (`pop()`) | `O(1)` | — |
| Сортировка `sorted()` | `O(n log n)` | — |

Выводы, которые ждут на собеседовании:
* много проверок «есть ли элемент» — переводим список в `set`;
* очередь (добавлять в конец, забирать из начала) — не `list`, а `collections.deque`: там оба конца за `O(1)`.

```python
ids = set(big_list)      # один раз O(n)
if user_id in ids: ...   # дальше каждая проверка O(1)
```

---

### 29. Что полезного есть в модуле collections? {gen}

* **`defaultdict`** — словарь, который сам создаёт значение для нового ключа.
* **`Counter`** — подсчёт частот.
* **`deque`** — двусторонняя очередь, `O(1)` с обоих концов; с `maxlen` — кольцевой буфер.
* **`namedtuple`** — кортеж с именованными полями (сейчас чаще берут `dataclass`).
* **`OrderedDict`** — нужен редко (обычный `dict` уже хранит порядок), но есть `move_to_end` — удобно для LRU.

```python
from collections import Counter, defaultdict, deque

Counter("abracadabra").most_common(2)   # [('a', 5), ('b', 2)]

groups = defaultdict(list)
for name, dept in [("Ann", "dev"), ("Bob", "dev")]:
    groups[dept].append(name)            # без проверки «есть ли ключ»

last = deque(maxlen=3)                   # хранит только 3 последних
```

---

### 30. Чем `__new__` отличается от `__init__`? Что такое `__slots__`? {gen}

* **`__new__`** — **создаёт** объект (статический метод, получает класс, возвращает экземпляр). Переопределяют редко: синглтон, наследование от неизменяемых типов (`int`, `str`, `tuple`).
* **`__init__`** — **инициализирует** уже созданный объект, ничего не возвращает.

**`__slots__`** — фиксированный список атрибутов вместо словаря `__dict__` у каждого объекта:
* **меньше памяти** (заметно на миллионах объектов) и чуть быстрее доступ;
* нельзя добавить атрибут, которого нет в списке.

```python
class Point:
    __slots__ = ("x", "y")

    def __init__(self, x, y):
        self.x = x
        self.y = y

p = Point(1, 2)
p.z = 3   # AttributeError
```

В `dataclass` то же самое включается через `@dataclass(slots=True)`.

---

### 31. Как закэшировать результат функции? {gen}

Декоратор **`functools.lru_cache`** (или `functools.cache` — без ограничения размера) запоминает результат по аргументам.

```python
from functools import lru_cache

@lru_cache(maxsize=1024)
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)

fib(100)            # мгновенно, без кэша — годы
fib.cache_info()    # hits, misses, размер
```

Ограничения:
* аргументы должны быть **хэшируемыми** (список передать нельзя);
* кэш живёт в памяти **одного процесса** — в сервисе с несколькими воркерами у каждого свой кэш, общий делают в Redis;
* не подходит для функций с побочными эффектами или данными, которые устаревают (нет TTL — для этого `cachetools.TTLCache`).

---

### 32. Как писать тесты на pytest: фикстуры, параметризация, моки? {gen}

**pytest** — стандарт для тестов в Python: обычные функции `test_*` и `assert`.

* **Фикстура** — подготовка данных или ресурсов, внедряется по имени аргумента; `yield` — для очистки после теста.
* **Параметризация** — один тест на много входных данных.
* **Моки** — подмена внешних зависимостей (`unittest.mock`, фикстура `monkeypatch`).

```python
import pytest
from app import service

@pytest.fixture
def user():
    return {"name": "Ann", "age": 30}

def test_user_name(user):
    assert user["name"] == "Ann"

@pytest.mark.parametrize("a, b, expected", [(1, 2, 3), (0, 0, 0), (-1, 1, 0)])
def test_add(a, b, expected):
    assert a + b == expected

def test_convert(monkeypatch):
    # подменяем поход во внешний API
    monkeypatch.setattr(service, "fetch_rate", lambda: 90.0)
    assert service.convert(10) == 900.0
```

Полезное: `pytest -x` (стоп на первой ошибке), `-k name` (по имени), `pytest-asyncio` для async-тестов, `pytest-cov` для покрытия.

## Микросервисы на Python

### 33. FastAPI, Flask или Django — что выбрать для микросервиса? {gen}

| | FastAPI | Flask | Django |
|---|---|---|---|
| Модель | async (ASGI) | sync (WSGI), минимализм | sync + async, «всё в коробке» |
| Валидация | Pydantic из коробки | вручную / расширения | формы, DRF-сериализаторы |
| Документация API | OpenAPI / Swagger автоматически | расширения | DRF + расширения |
| Скорость | высокая | средняя | средняя |
| Когда | API-сервисы, микросервисы, LLM-бэкенды | простые сервисы | монолит с админкой и ORM |

Для микросервиса сегодня чаще всего выбирают **FastAPI**: async для I/O, типы и валидация через Pydantic, документация бесплатно.

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class OrderIn(BaseModel):
    user_id: int
    amount: float

@app.post("/orders", status_code=201)
async def create_order(order: OrderIn) -> dict:
    return {"id": 1, **order.model_dump()}
```

---

### 34. Что такое Pydantic и зачем он в сервисе? {gen}

**Pydantic** — валидация и преобразование данных по аннотациям типов. Всё, что пришло извне (JSON запроса, переменные окружения, ответ другого сервиса или LLM), превращается в типизированный объект или даёт понятную ошибку.

```python
from pydantic import BaseModel, EmailStr, Field, ValidationError

class User(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    age: int = Field(ge=0, le=150)

try:
    User(name="Ann", email="not-an-email", age="30")
except ValidationError as e:
    print(e)   # email невалиден; "30" превратился бы в int 30
```

В FastAPI модели Pydantic — это и валидация запроса, и схема ответа, и документация OpenAPI. Методы: `model_validate()` (из dict), `model_dump()` (в dict), `model_dump_json()`.

---

### 35. Чем в FastAPI отличается `def` от `async def` в обработчике? {gen}

* **`async def`** — выполняется прямо в event loop. Внутри можно только **неблокирующий** код: `await` async-клиентов (`httpx.AsyncClient`, `asyncpg`, async SQLAlchemy).
* **`def`** — FastAPI сам запускает его **в пуле потоков**, поэтому блокирующие вызовы (`requests`, синхронный драйвер БД) не останавливают остальные запросы.

**Главная ошибка:** блокирующий вызов внутри `async def`.

```python
@app.get("/bad")
async def bad():
    time.sleep(2)              # блокирует весь event loop — встали ВСЕ запросы
    return requests.get(URL).json()

@app.get("/good")
async def good():
    async with httpx.AsyncClient(timeout=5) as client:
        r = await client.get(URL)
    return r.json()
```

Тяжёлые вычисления — не в обработчик, а в отдельный процесс или очередь задач.

---

### 36. Как устроено внедрение зависимостей (Depends) в FastAPI? {gen}

`Depends` — FastAPI сам вызывает функцию-зависимость и передаёт результат в обработчик. Так подключают сессию БД, текущего пользователя, настройки — без глобальных переменных, и в тестах их легко подменить.

```python
from fastapi import Depends, Header, HTTPException

async def get_db():
    async with SessionLocal() as session:
        yield session               # после ответа сессия закроется

async def current_user(authorization: str = Header()):
    user = await verify_token(authorization)
    if not user:
        raise HTTPException(status_code=401)
    return user

@app.get("/me")
async def me(user=Depends(current_user), db=Depends(get_db)):
    return await load_profile(db, user.id)

# в тестах
app.dependency_overrides[current_user] = lambda: FakeUser(id=1)
```

---

### 37. Как работать с базой данных в async-сервисе? {gen}

* **SQLAlchemy 2.0** (async) — ORM и query builder, самый частый выбор; **asyncpg** — быстрый драйвер Postgres; **Alembic** — миграции.
* **Сессия на запрос** — через `Depends`, закрывается после ответа.
* **Пул соединений** — создаётся один раз на процесс (`create_async_engine`), настраиваются `pool_size`, `max_overflow`, `pool_pre_ping`.
* **Транзакции** — `async with session.begin():` — коммит при успехе, откат при исключении.

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine(
    "postgresql+asyncpg://user:pass@db/app",
    pool_size=10, max_overflow=5, pool_pre_ping=True,
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def transfer(session, src, dst, amount):
    async with session.begin():           # одна транзакция
        await debit(session, src, amount)
        await credit(session, dst, amount)
```

Ловушки: N+1 запросов при ленивой загрузке связей (в async она вообще падает — нужен `selectinload`), один `AsyncSession` нельзя использовать из нескольких задач одновременно.

---

### 38. Как выполнять фоновые задачи: BackgroundTasks, Celery, очереди? {gen}

* **`BackgroundTasks` (FastAPI)** — выполнить что-то лёгкое **после** ответа в том же процессе (отправить письмо, записать аудит). Если процесс упадёт — задача потеряется.
* **Celery / RQ / Dramatiq / arq** — отдельные воркеры и брокер (Redis, RabbitMQ). Ретраи, расписание, масштабирование отдельно от API. Для всего тяжёлого и важного.
* **Kafka / RabbitMQ напрямую** — когда это события между сервисами, а не задачи.

```python
from fastapi import BackgroundTasks

@app.post("/signup")
async def signup(user: UserIn, tasks: BackgroundTasks):
    await save(user)
    tasks.add_task(send_welcome_email, user.email)
    return {"ok": True}
```

Правило: если задача долгая, должна пережить рестарт или нуждается в ретраях — в очередь, а не в `BackgroundTasks`. Задачи делать **идемпотентными** — доставка обычно at-least-once.

---

### 39. Как запускать Python-сервис в проде? Uvicorn, Gunicorn, воркеры {gen}

* **Uvicorn** — ASGI-сервер, запускает FastAPI.
* Один процесс Python использует **одно ядро** (GIL), поэтому для нескольких ядер запускают **несколько процессов-воркеров**: `uvicorn --workers 4` или Gunicorn с воркерами Uvicorn.
* **В Kubernetes** чаще делают проще: **один процесс на контейнер**, а масштабируют числом подов — так понятнее лимиты и метрики.

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Что ещё обязательно:
* `/health` (жив ли процесс) и `/ready` (готов ли принимать трафик — БД доступна);
* корректное завершение по SIGTERM — дождаться текущих запросов;
* конфигурация через переменные окружения;
* за сервисом — балансировщик или ingress, TLS снаружи.

---

### 40. Как управлять жизненным циклом сервиса: старт, остановка, health checks? {gen}

В FastAPI для этого `lifespan`: код до `yield` выполняется при старте, после — при остановке. Здесь создают и закрывают пулы соединений, HTTP-клиенты, консьюмеры.

```python
from contextlib import asynccontextmanager
import httpx

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(timeout=5)   # один клиент на процесс
    yield
    await app.state.http.aclose()                   # graceful shutdown
    await engine.dispose()

app = FastAPI(lifespan=lifespan)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

Uvicorn по SIGTERM перестаёт принимать новые соединения, дожидается текущих запросов и вызывает код после `yield`. Kubernetes даёт на это `terminationGracePeriodSeconds` (30 с).

---

### 41. Как сервисам общаться между собой из Python? {gen}

* **HTTP/REST** — `httpx` (sync и async). **Обязательно**: таймауты, ретраи с backoff только для идемпотентных запросов, один клиент на процесс (пул соединений), прокидывание `trace_id`.
* **gRPC** — `grpcio` + `grpcio-tools` для генерации кода из `.proto`; есть async API (`grpc.aio`).
* **Асинхронно через брокер** — `aiokafka` / `confluent-kafka`, `aio-pika` (RabbitMQ).

```python
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

client = httpx.AsyncClient(
    base_url="http://users-svc",
    timeout=httpx.Timeout(5.0, connect=1.0),
)

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=0.2, max=2))
async def get_user(user_id: int) -> dict:
    r = await client.get(f"/users/{user_id}")
    r.raise_for_status()
    return r.json()
```

Плюс паттерны устойчивости: **circuit breaker**, ограничение параллелизма, idempotency key для POST.

---

### 42. Как тестировать HTTP-сервис на FastAPI? {gen}

* **Юнит-тесты** — бизнес-логика отдельно от фреймворка, обычный pytest.
* **Тесты API** — `TestClient` (sync) или `httpx.AsyncClient` с `ASGITransport` (async): запрос идёт прямо в приложение, без сети.
* **Зависимости** подменяются через `app.dependency_overrides`.
* **Интеграционные** — настоящая БД и брокер в контейнерах (**testcontainers**).

```python
from fastapi.testclient import TestClient
from app.main import app, current_user

app.dependency_overrides[current_user] = lambda: FakeUser(id=1)
client = TestClient(app)

def test_create_order():
    r = client.post("/orders", json={"user_id": 1, "amount": 10.5})
    assert r.status_code == 201
    assert r.json()["amount"] == 10.5

def test_validation():
    r = client.post("/orders", json={"user_id": "x"})
    assert r.status_code == 422      # Pydantic отклонил запрос
```

---

### 43. Как сделать сервис наблюдаемым: логи, метрики, трейсы? {gen}

* **Логи** — структурированные JSON (`structlog` или `logging` с JSON-форматтером), в stdout, с `trace_id` и `request_id`.
* **Метрики** — `prometheus-client` или `prometheus-fastapi-instrumentator`: RPS, ошибки, латентность (histogram), эндпоинт `/metrics`.
* **Трейсы** — **OpenTelemetry**: есть автоинструментация FastAPI, httpx, SQLAlchemy, Redis — спаны появляются без правки кода.

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install
OTEL_SERVICE_NAME=orders \
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317 \
opentelemetry-instrument uvicorn app.main:app
```

Для LLM-сервисов дополнительно логируют модель, число входных и выходных токенов, стоимость и латентность каждого вызова.

## Работа с LLM

### 44. Как вызвать LLM из Python? Из чего состоит запрос и ответ? {gen}

Через официальный SDK провайдера (`anthropic`, `openai`, `google-genai`). API **без состояния**: каждый раз отправляется вся история диалога.

* **`model`** — какая модель отвечает;
* **`system`** — инструкции: роль, правила, формат;
* **`messages`** — диалог, чередование `user` / `assistant`;
* **`max_tokens`** — потолок длины ответа.

```python
import anthropic

client = anthropic.Anthropic()   # ключ берётся из ANTHROPIC_API_KEY

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    system="Ты помощник Go-разработчика. Отвечай кратко.",
    messages=[{"role": "user", "content": "Что такое GIL?"}],
)

# ответ — список блоков разных типов, текст собираем только из text
text = "".join(b.text for b in response.content if b.type == "text")
print(text, response.stop_reason, response.usage)
```

Что смотреть в ответе: `stop_reason` (`end_turn` — закончил, `max_tokens` — обрезан, `tool_use` — хочет вызвать инструмент) и `usage` — сколько токенов ушло. Ключ — только из переменных окружения или секретов, никогда в коде.

---

### 45. Что такое токены и контекстное окно? Как оценить стоимость? {gen}

* **Токен** — кусок текста, с которым работает модель: часть слова, слово, знак. На русском токенов на тот же текст обычно больше, чем на английском.
* **Контекстное окно** — сколько токенов модель видит за раз: system + вся история + ответ. Всё, что не влезло, модель не видит.
* **Цена** считается отдельно за входные и выходные токены; выходные в несколько раз дороже.

```python
count = client.messages.count_tokens(
    model="claude-opus-5-5",
    messages=[{"role": "user", "content": long_text}],
)
print(count.input_tokens)

# после вызова — фактический расход
print(response.usage.input_tokens, response.usage.output_tokens)
```

Как экономить: не слать лишний контекст (обрезать историю, RAG вместо всего документа), кэшировать повторяющийся префикс (prompt caching), брать модель подешевле для простых задач, batch API для офлайн-обработки.

---

### 46. Как стримить ответ модели пользователю? {gen}

Ответ модели генерируется секундами. Без стриминга пользователь ждёт целиком; со стримингом текст появляется сразу по кусочкам. Для длинных ответов стриминг ещё и защищает от HTTP-таймаутов.

```python
import anthropic
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()
client = anthropic.AsyncAnthropic()

@app.post("/chat")
async def chat(q: Question):
    async def generate():
        async with client.messages.stream(
            model="claude-opus-5-5",
            max_tokens=4096,
            messages=[{"role": "user", "content": q.text}],
        ) as stream:
            async for text in stream.text_stream:
                yield text

    return StreamingResponse(generate(), media_type="text/plain")
```

Для браузера часто используют формат **SSE** (`text/event-stream`). Если нужен итоговый ответ целиком (например, сохранить в БД) — `await stream.get_final_message()`.

---

### 47. Как получить от модели структурированный ответ (JSON), а не свободный текст? {gen}

Просить «ответь в JSON» в промпте ненадёжно: модель может добавить пояснение или нарушить схему. Правильно — **structured outputs**: схема задаётся в запросе, и ответ ей гарантированно соответствует. С Pydantic получается сразу типизированный объект.

```python
from pydantic import BaseModel

class Ticket(BaseModel):
    category: str
    priority: int
    summary: str

response = client.messages.parse(
    model="claude-opus-5-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": f"Разбери обращение:\n{text}"}],
    output_format=Ticket,
)
ticket = response.parsed_output     # объект Ticket, уже провалидирован
print(ticket.priority)
```

Применение: извлечение данных из документов, классификация, разбор обращений — всё, где результат читает код, а не человек.

---

### 48. Что такое tool use (function calling)? Как это работает? {gen}

Модель сама ничего не вызывает. Мы описываем **инструменты** (имя, описание, JSON-схема аргументов), модель решает, какой нужен, и возвращает `tool_use` с аргументами. **Наш код** выполняет функцию и отправляет результат обратно — и так в цикле, пока модель не даст финальный ответ.

```python
import json

tools = [{
    "name": "get_order_status",
    "description": "Статус заказа по его номеру",
    "input_schema": {
        "type": "object",
        "properties": {"order_id": {"type": "string"}},
        "required": ["order_id"],
    },
}]

messages = [{"role": "user", "content": "Где мой заказ 42?"}]
while True:
    resp = client.messages.create(
        model="claude-opus-5-5", max_tokens=4096,
        tools=tools, messages=messages,
    )
    if resp.stop_reason != "tool_use":
        break
    messages.append({"role": "assistant", "content": resp.content})
    results = []
    for block in resp.content:
        if block.type == "tool_use":
            out = get_order_status(**block.input)   # наш код
            results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": json.dumps(out),
            })
    messages.append({"role": "user", "content": results})
```

Важно: аргументы от модели — **недоверенные данные**, их нужно валидировать; опасные действия (оплата, удаление) — подтверждать.

---

### 49. Как обрабатывать ошибки, rate limit и таймауты при вызове LLM? {gen}

* **429 (rate limit), 5xx, сетевые ошибки** — временные, их ретраят с экспоненциальной задержкой. SDK Anthropic **уже ретраит их сам** (по умолчанию 2 раза), число настраивается.
* **400, 401, 403, 404** — ошибка в запросе, ключе или модели; повтор не поможет.
* **Таймауты** — у генерации может быть долгий ответ; для длинных ответов лучше стриминг.

```python
import anthropic

client = anthropic.Anthropic(max_retries=4, timeout=60.0)

try:
    r = client.messages.create(model="claude-opus-5-5", max_tokens=1024,
                               messages=[{"role": "user", "content": q}])
except anthropic.RateLimitError:
    ...   # ретраи кончились — отдать 503 / положить в очередь
except anthropic.APIStatusError as e:
    log.error("llm error", status=e.status_code)
except anthropic.APIConnectionError:
    ...   # сеть
```

На уровне сервиса ещё: лимит параллельных запросов к модели, очередь для пиковых нагрузок, fallback на другую модель, понятное сообщение пользователю вместо 500.

---

### 50. Как обработать тысячи запросов к модели быстро и не упереться в лимиты? {gen}

* **Онлайн** — асинхронный клиент + `asyncio.gather`, но с **ограничением параллелизма** через `Semaphore`, иначе сразу получим 429.
* **Офлайн** (не нужно мгновенно: разметка, суммаризация архива) — **Batch API**: отправляем пачку, результаты приходят позже (до 24 часов), но **вдвое дешевле**.

```python
import asyncio
import anthropic

client = anthropic.AsyncAnthropic()
sem = asyncio.Semaphore(10)   # не больше 10 запросов одновременно

async def summarize(text: str) -> str:
    async with sem:
        r = await client.messages.create(
            model="claude-opus-5-5",
            max_tokens=1024,
            messages=[{"role": "user", "content": f"Кратко перескажи:\n\n{text}"}],
        )
        return "".join(b.text for b in r.content if b.type == "text")

async def main(docs: list[str]) -> list[str]:
    return await asyncio.gather(*(summarize(d) for d in docs))
```

---

### 51. Что такое prompt caching и когда он помогает? {gen}

Если много запросов начинаются с **одинакового длинного префикса** (большой system-промпт, документ, описание инструментов), провайдер может закэшировать его обработку. Повторное чтение из кэша стоит около 10% обычной цены входных токенов и отвечает быстрее.

```python
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    cache_control={"type": "ephemeral"},   # закэшировать префикс
    system=BIG_KNOWLEDGE_BASE,             # одинаковый во всех запросах
    messages=[{"role": "user", "content": question}],
)
print(response.usage.cache_read_input_tokens)   # > 0 — попали в кэш
```

Правила:
* кэш работает по **точному совпадению префикса**: стабильное — в начало, меняющееся (вопрос, время, id) — в конец;
* `datetime.now()` в system-промпте ломает кэш на каждом запросе;
* кэш живёт минуты (по умолчанию 5, можно дольше), слишком короткий префикс не кэшируется.

---

### 52. Что такое temperature? Как сделать ответы модели стабильнее? {gen}

**Temperature** — параметр случайности при выборе следующего токена: около 0 — почти всегда самый вероятный вариант, выше — разнообразнее и «креативнее». Есть у многих провайдеров (OpenAI, Gemini).

Нюансы, которые стоит знать:
* даже при 0 ответы LLM **не гарантированно одинаковы**;
* в актуальном Claude API `temperature`, `top_p` и `top_k` больше не принимаются — глубину и тщательность ответа регулируют параметром **effort** (`output_config={"effort": "low"}` … `"max"`) и инструкциями.

Как реально добиться стабильности:
* чёткий промпт с примерами нужного ответа;
* **structured outputs** вместо свободного текста;
* проверка результата кодом (валидация, повтор при ошибке);
* **evals** — замерять качество на наборе примеров при каждом изменении промпта.

---

### 53. Что такое RAG и как он устроен? {gen}

**RAG** (Retrieval-Augmented Generation) — перед ответом находим релевантные куски из своих данных и кладём их в промпт. Модель отвечает **по документам**, а не по памяти: меньше выдумок, свежие и приватные данные, можно ссылаться на источник.

**Индексация (заранее):** документы → разбить на **чанки** → посчитать **эмбеддинги** → сохранить в **векторную БД**.

**Запрос:** вопрос → эмбеддинг → поиск ближайших чанков → промпт «ответь по этим документам» → модель.

```python
def answer(question: str) -> str:
    chunks = vector_db.search(embed(question), top_k=5)
    context = "\n\n".join(f"<doc id='{c.id}'>\n{c.text}\n</doc>" for c in chunks)

    r = client.messages.create(
        model="claude-opus-5-5",
        max_tokens=2048,
        system="Отвечай только по документам. Если ответа в них нет — так и скажи. "
               "Указывай id документа, на который опираешься.",
        messages=[{"role": "user", "content": f"{context}\n\nВопрос: {question}"}],
    )
    return "".join(b.text for b in r.content if b.type == "text")
```

Как улучшают качество: **гибридный поиск** (векторный + полнотекстовый BM25), **reranking** найденных кусков, хорошее разбиение на чанки, метаданные для фильтрации (дата, отдел, права доступа).

---

### 54. Что такое эмбеддинги и векторные базы данных? {gen}

**Эмбеддинг** — вектор чисел (сотни–тысячи измерений), который кодирует **смысл** текста. Похожие по смыслу тексты дают близкие векторы — даже если слова разные («оплата не прошла» ≈ «платёж отклонён»).

Близость считают **косинусным сходством** или скалярным произведением.

**Где взять эмбеддинги:** API-модели (Voyage AI, OpenAI, Gemini, Cohere) или локальные (`sentence-transformers`). У Claude своего endpoint для эмбеддингов нет — Anthropic рекомендует Voyage AI.

**Векторная БД** — хранит векторы и быстро ищет ближайшие (приближённый поиск, индекс HNSW):
* **pgvector** — расширение Postgres; хорош, если Postgres уже есть;
* **Qdrant, Weaviate, Milvus, Pinecone** — отдельные специализированные решения;
* **Chroma, FAISS** — для прототипов и локально.

```sql
CREATE EXTENSION vector;
CREATE TABLE chunks (id bigserial, text text, embedding vector(1024));
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);

SELECT id, text FROM chunks
ORDER BY embedding <=> $1   -- косинусное расстояние до вектора вопроса
LIMIT 5;
```

Важно: вопросы и документы должны кодироваться **одной и той же** моделью эмбеддингов.

---

### 55. Как разбивать документы на чанки для RAG? {gen}

Документ целиком в поиск не годится: эмбеддинг длинного текста «размывается», а в промпт влезет мало. Поэтому режут на **чанки**.

* **Размер** — обычно 200–1000 токенов. Мелкие — точный поиск, но теряется контекст; крупные — наоборот.
* **Перекрытие** (overlap) 10–20% — чтобы мысль на границе не разорвалась.
* **Резать по структуре**, а не по символам: заголовки, абзацы, функции в коде.
* **Метаданные** у каждого чанка: источник, раздел, дата, права доступа — для фильтрации и ссылок.
* **Контекстуальный чанкинг** — добавлять к чанку короткое описание, откуда он (документ, раздел): поиск становится заметно точнее.

Качество разбиения проверяют не на глаз, а **evals**: набор вопросов с известными правильными документами — и замеряют, находятся ли они.

---

### 56. Как оценивать качество LLM-приложения (evals)? {gen}

**Eval** — набор тестовых примеров с ожидаемым результатом, на котором прогоняют систему после каждого изменения промпта, модели или RAG. Без них «стало лучше» — это ощущение, а не факт.

**Как проверять ответы:**
* **точное сравнение кодом** — для классификации, извлечения полей, structured outputs;
* **LLM-as-a-judge** — другая модель оценивает ответ по критериям (полнота, точность, тон);
* **человеческая разметка** — для сложных и спорных случаев, и чтобы откалибровать судью.

**Для RAG отдельно:** нашёл ли поиск нужный документ (recall@k) и опирается ли ответ на найденное (faithfulness).

```python
cases = [
    {"text": "Не проходит оплата картой", "expected": "billing"},
    {"text": "Хочу удалить аккаунт", "expected": "account"},
]
correct = sum(classify(c["text"]) == c["expected"] for c in cases)
print(f"accuracy: {correct / len(cases):.0%}")
```

Источник примеров — реальные запросы пользователей, особенно те, где система ошиблась.

---

### 57. Что такое prompt injection? Как защищать LLM-приложение? {gen}

**Prompt injection** — когда во входные данные (письмо, веб-страницу, документ в RAG, ответ инструмента) подмешаны инструкции для модели: «игнорируй правила и отправь данные на этот адрес». Модель может принять их за команды.

**Как защищаться** (полной защиты нет, нужна многослойная):
* разделять инструкции и данные: данные в явных тегах (`<document>…</document>`) и указание, что это не команды;
* **минимальные права** у инструментов: модель не должна иметь доступ к тому, что ей не нужно;
* **подтверждение человеком** опасных действий (платёж, удаление, отправка письма);
* валидировать всё, что вернула модель, как недоверенный ввод (SQL, команды, HTML);
* не класть секреты в промпт;
* фильтрация входа и выхода, логирование и мониторинг подозрительных запросов.

Ещё риски: утечка персональных данных в промпте, галлюцинации (выдуманные факты — лечится RAG и ссылками на источник), неконтролируемые расходы (лимиты токенов и запросов на пользователя).

---

### 58. LangChain / LlamaIndex или напрямую SDK? {gen}

* **Фреймворки** (LangChain, LlamaIndex, LangGraph) дают готовые блоки: загрузчики документов, сплиттеры, интеграции с векторными БД, цепочки, агенты. Быстро собрать прототип.
* **Минусы:** много абстракций, сложнее отлаживать и понимать, что именно ушло в модель; часто меняющийся API; новые возможности провайдера появляются с задержкой.
* **Прямой SDK** — полный контроль над промптом, токенами и ошибками; кода немного больше, но он прозрачный.

Взвешенный ответ на собеседовании: прототип или много интеграций — фреймворк; прод с простым пайплайном — прямой SDK плюс свои небольшие абстракции. Отдельные части фреймворков (например, сплиттеры LlamaIndex) можно брать точечно.

---

### 59. Что такое AI-агент и MCP? {gen}

**Агент** — LLM в цикле с инструментами: модель сама решает, какой инструмент вызвать, смотрит на результат и продолжает, пока задача не решена. Отличие от обычного workflow — порядок шагов определяет модель, а не наш код.

Когда агент оправдан: задача многошаговая и заранее её не расписать. Если шаги известны — надёжнее и дешевле обычная цепочка вызовов.

**MCP** (Model Context Protocol) — открытый протокол подключения инструментов и данных к LLM-приложениям. Инструмент пишется один раз как **MCP-сервер** и работает в любом клиенте с поддержкой MCP (Claude Code, IDE, свои агенты).

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("orders")

@mcp.tool()
def order_status(order_id: str) -> str:
    """Возвращает статус заказа по номеру."""
    return db.get_status(order_id)

if __name__ == "__main__":
    mcp.run()
```

Сервер отдаёт **tools** (действия), **resources** (данные для чтения) и **prompts** (шаблоны).
