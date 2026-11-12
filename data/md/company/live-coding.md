# Live coding

## Мои задачи

### 1. HTTP-запросы по списку ссылок: «url - ok» / «url - not ok»

**Условие.** Напишите программу, которая поочерёдно выполнит HTTP-запросы по предложенному списку ссылок:
* если ответ «200 OK» — печатаем на экране «адрес url - ok»;
* если код ответа другой или произошла ошибка — печатаем «адрес url - not ok».

**Моё решение** (producer → 5 воркеров → вывод результатов, отмена через `context`):

```go
package main

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"
)

//Напишите программу, которая:
//	1.	Поочередно выполнит http запросы по предложенному списку ссылок
//• в случае получения http-кода ответа на запрос “200 OK” печатаем на экране “адрес url - ok”
//• в случае получения http-кода ответа на запрос отличного от “200 OK” либо в случае ошибки печатаем на экране “адрес url - not ok”

type Results struct {
	Url    string
	Status string
}

func producer(cxt context.Context, jobs chan<- string) {
	defer close(jobs)

	urls := []string{
		"http://ozon.ru",
		"https://ozon.ru",
		"http://google.com",
		"http://somesite.com",
		"http://non-existent.domain.tld",
		"https://ya.ru",
		"http://ya.ru",
		"http://ёёёё",
	}

	for _, url := range urls {
		select {
		case <-cxt.Done():
			return
		case jobs <- url:
		}
	}
}

func worker(cxt context.Context, client *http.Client, jobs <-chan string, results chan<- Results, wg *sync.WaitGroup) {
	defer wg.Done()

	for {
		select {
		case <-cxt.Done():
			return
		case url, ok := <-jobs:
			if !ok {
				return
			}
			resp, err := client.Get(url)

			if err != nil {
				results <- Results{Url: url, Status: "not ok"}
				continue
			}

			defer resp.Body.Close()

			if resp.StatusCode == http.StatusOK {
				results <- Results{Url: url, Status: "ok"}
			} else {
				results <- Results{Url: url, Status: "not ok"}
			}
		}
	}
}

func main() {
	cxt, cancel := context.WithCancel(context.Background())
	defer cancel()

	jobs := make(chan string)
	results := make(chan Results)
	var wg sync.WaitGroup

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	go producer(cxt, jobs)

	for i := 0; i < 5; i++ {
		wg.Add(1)
		go worker(cxt, client, jobs, results, &wg)
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	for result := range results {
		fmt.Printf("адрес %s - %s\n", result.Status, result.Url)
	}

}
```

---

### 2. Разбор решения задачи 1: что спросит интервьюер {gen}

Решение рабочее, но на live coding обычно цепляются к этому:

* **`defer resp.Body.Close()` внутри цикла.** `defer` срабатывает при выходе из *функции*, а воркер живёт весь цикл — тела ответов копятся открытыми. Закрывать сразу после проверки статуса.
* **Перепутаны аргументы `Printf`:** выводится «адрес ok - http://…». Нужно `result.Url, result.Status`.
* **«Поочерёдно» в условии.** Если имелось в виду последовательно — достаточно простого цикла; если параллельно, но с выводом в исходном порядке — складывать результаты по индексу.
* **Отправка в `results` без `select` по `ctx`.** При отмене воркер может навсегда зависнуть на отправке, если читателя уже нет.
* **`cxt` → `ctx`** — общепринятое имя.

Исправленный воркер:

```go
resp, err := client.Get(url)
status := "not ok"
if err == nil {
    if resp.StatusCode == http.StatusOK {
        status = "ok"
    }
    resp.Body.Close()
}
select {
case results <- Results{Url: url, Status: status}:
case <-ctx.Done():
    return
}
```

Последовательный вариант — то, что буквально просит условие:

```go
for _, url := range urls {
    status := "not ok"
    resp, err := client.Get(url)
    if err == nil {
        if resp.StatusCode == http.StatusOK {
            status = "ok"
        }
        resp.Body.Close()
    }
    fmt.Printf("%s - %s\n", url, status)
}
```

---

## Примеры задач

### 3. Что выведет программа? Слайсы и append {gen}

```go
a := []int{1, 2, 3}
b := a[:2]
b = append(b, 99)
fmt.Println(a)

b = append(b, 100)
b[0] = -1
fmt.Println(a, b)
```

**Ответ:**
```
[1 2 99]
[1 2 99] [-1 2 99 100]
```

`b := a[:2]` делит с `a` один массив (len 2, cap 3), поэтому первый `append` пишет прямо в `a[2]`. Второй `append` превышает cap — Go выделяет **новый** массив, и дальше `b` с `a` уже не связаны.

---

### 4. Что выведет программа? nil-ошибка, которая не nil {gen}

```go
type MyErr struct{}

func (*MyErr) Error() string { return "boom" }

func do() error {
    var e *MyErr = nil
    return e
}

func main() {
    fmt.Println(do() == nil)
}
```

**Ответ:** `false`.

Интерфейс равен `nil`, только когда пусты **и тип, и значение**. Здесь внутри интерфейса тип `*MyErr` и значение `nil` — интерфейс не пустой.

**Как правильно:** возвращать `nil` явно, а не типизированный nil-указатель.

```go
func do() error {
    if somethingWrong {
        return &MyErr{}
    }
    return nil
}
```

---

### 5. Что выведет программа? defer и именованный результат {gen}

```go
func f() (x int) {
    defer func() { x *= 2 }()
    x = 5
    return x + 1
}

func main() { fmt.Println(f()) }
```

**Ответ:** `12`.

`return x + 1` сначала записывает 6 в именованный результат `x`, потом выполняется `defer` и удваивает его. С неименованным результатом `defer` не смог бы изменить возвращаемое значение.

---

### 6. Что выведет программа? Горутины в цикле {gen}

```go
func main() {
    for i := 0; i < 3; i++ {
        go func() { fmt.Println(i) }()
    }
}
```

**Ответ:** скорее всего **ничего** — `main` завершается раньше, чем горутины успевают выполниться.

Если дождаться их, то с Go 1.22 будет `0 1 2` в случайном порядке (у каждой итерации своя `i`). До 1.22 все горутины делили одну переменную и чаще печатали `3 3 3`.

```go
var wg sync.WaitGroup
for i := 0; i < 3; i++ {
    wg.Go(func() { fmt.Println(i) }) // Go 1.25+
}
wg.Wait()
```

---

### 7. Найти и исправить гонку данных {gen}

```go
var cnt int
var wg sync.WaitGroup
for i := 0; i < 1000; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        cnt++
    }()
}
wg.Wait()
fmt.Println(cnt) // иногда меньше 1000
```

`cnt++` — это «прочитать, прибавить, записать», и горутины перетирают результаты друг друга. Найти: `go run -race`.

**Исправление** — атомик (или `sync.Mutex`, если защищать нужно больше одной переменной):

```go
var cnt atomic.Int64
// ...
cnt.Add(1)
// ...
fmt.Println(cnt.Load()) // всегда 1000
```

---

### 8. Объединить N каналов в один (fan-in) {gen}

**Условие:** функция принимает несколько каналов и возвращает один, в который приходят значения из всех. Выходной канал закрывается, когда закрыты все входные.

```go
func merge[T any](chs ...<-chan T) <-chan T {
    out := make(chan T)
    var wg sync.WaitGroup
    for _, ch := range chs {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for v := range ch {
                out <- v
            }
        }()
    }
    go func() {
        wg.Wait()
        close(out)
    }()
    return out
}
```

На каждый входной канал — своя горутина. Закрывает `out` отдельная горутина после `wg.Wait()`: закрыть раньше — будет паника при отправке.

---

### 9. Обработать список параллельно, но не больше N одновременно {gen}

**Условие:** скачать 100 URL, не больше 3 запросов одновременно; при первой ошибке остальное отменить.

```go
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(3)
for _, url := range urls {
    g.Go(func() error {
        return fetch(ctx, url)
    })
}
if err := g.Wait(); err != nil {
    return err // первая ошибка
}
```

Без сторонних пакетов — семафор на буферизованном канале:

```go
sem := make(chan struct{}, 3)
var wg sync.WaitGroup
for _, url := range urls {
    wg.Add(1)
    go func() {
        defer wg.Done()
        sem <- struct{}{}        // занять слот
        defer func() { <-sem }() // освободить
        fetch(ctx, url)
    }()
}
wg.Wait()
```

---

### 10. Выполнить функцию с таймаутом {gen}

**Условие:** вызвать функцию и вернуть ошибку, если она не уложилась в заданное время.

```go
func withTimeout(ctx context.Context, d time.Duration,
    fn func(context.Context) (int, error)) (int, error) {

    ctx, cancel := context.WithTimeout(ctx, d)
    defer cancel()

    type result struct {
        v   int
        err error
    }
    ch := make(chan result, 1) // буфер: горутина не зависнет
    go func() {
        v, err := fn(ctx)
        ch <- result{v, err}
    }()

    select {
    case r := <-ch:
        return r.v, r.err
    case <-ctx.Done():
        return 0, ctx.Err()
    }
}
```

Главная ловушка — **канал без буфера**: если таймаут уже сработал, горутина навсегда зависнет на отправке (утечка). И `fn` должна сама слушать `ctx`, иначе она продолжит работать в фоне.

---

### 11. Retry с экспоненциальной задержкой {gen}

**Условие:** повторять вызов до N раз, увеличивая паузу вдвое; учитывать отмену контекста.

```go
func retry(ctx context.Context, attempts int, fn func() error) error {
    delay := 100 * time.Millisecond
    var err error
    for i := range attempts {
        if err = fn(); err == nil {
            return nil
        }
        if i == attempts-1 {
            break
        }
        select {
        case <-time.After(delay):
            delay *= 2
        case <-ctx.Done():
            return ctx.Err()
        }
    }
    return fmt.Errorf("после %d попыток: %w", attempts, err)
}
```

Что ещё обсудить: добавить **jitter** (случайный разброс), чтобы клиенты не ретраили синхронно; ретраить только временные ошибки (таймаут, 503), а не 400.

---

### 12. Пересечение двух слайсов {gen}

**Условие:** вернуть элементы, которые есть в обоих слайсах, без дублей.

```go
func intersect(a, b []int) []int {
    seen := make(map[int]struct{}, len(a))
    for _, v := range a {
        seen[v] = struct{}{}
    }
    var res []int
    for _, v := range b {
        if _, ok := seen[v]; ok {
            res = append(res, v)
            delete(seen, v) // чтобы не было дублей
        }
    }
    return res
}
```

Сложность `O(n + m)` по времени и `O(n)` по памяти. Наивный вариант двумя циклами — `O(n·m)`. `map[int]struct{}` — идиоматичное множество в Go: пустая структура не занимает памяти.

---

### 13. LRU-кэш {gen}

**Условие:** кэш на `cap` элементов, `Get` и `Put` за `O(1)`; при переполнении вытесняется давно не использованный.

Идея: **map** для поиска за `O(1)` + **двусвязный список** для порядка использования (свежие — в начале).

```go
type entry struct{ key, val int }

type LRU struct {
    cap   int
    ll    *list.List
    items map[int]*list.Element
}

func New(cap int) *LRU {
    return &LRU{cap: cap, ll: list.New(),
        items: map[int]*list.Element{}}
}

func (c *LRU) Get(k int) (int, bool) {
    e, ok := c.items[k]
    if !ok {
        return 0, false
    }
    c.ll.MoveToFront(e)
    return e.Value.(*entry).val, true
}

func (c *LRU) Put(k, v int) {
    if e, ok := c.items[k]; ok {
        e.Value.(*entry).val = v
        c.ll.MoveToFront(e)
        return
    }
    c.items[k] = c.ll.PushFront(&entry{k, v})
    if c.ll.Len() > c.cap {
        last := c.ll.Back()
        c.ll.Remove(last)
        delete(c.items, last.Value.(*entry).key)
    }
}
```

Не потокобезопасен — для конкурентного доступа обернуть методы в `sync.Mutex` (именно Mutex, не RWMutex: `Get` тоже меняет список).
