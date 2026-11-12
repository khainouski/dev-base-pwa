# Синтаксис Go, типы и конкурентность

## Содержание

**[Types: simple and composite](#types-simple-and-composite)**

- [Q1. Walk through Go’s numeric types: when would you pick int vs int64, float32 vs float64?](#q1-walk-through-gos-numeric-types-when-would-you-pick-int-vs-int64-float32-vs-float64)
- [Q2. What is the zero value of a pointer, slice, map, channel, interface, struct?](#q2-what-is-the-zero-value-of-a-pointer-slice-map-channel-interface-struct)
- [Q3. How does string relate to []byte and []rune? When is conversion copying?](#q3-how-does-string-relate-to-byte-and-rune-when-is-conversion-copying)
- [Q4. What are named types vs type aliases? (`type UserID int` vs `type UserID = int`)](#q4-what-are-named-types-vs-type-aliases-type-userid-int-vs-type-userid--int)
- [Q5. If you compare two values of different named types both based on string, does it compile?](#q5-if-you-compare-two-values-of-different-named-types-both-based-on-string-does-it-compile)
- [Q6. Why is `var s []int` a nil slice and `len(s) == 0` still valid — and can you append to `s`?](#q6-why-is-var-s-int-a-nil-slice-and-lens--0-still-valid--and-can-you-append-to-s)
- [Q7. Is a Go string mutable? How does UTF-8 relate to indexing a string with `s[i]`?](#q7-is-a-go-string-mutable-how-does-utf-8-relate-to-indexing-a-string-with-si)
- [Q8. When would converting string ↔ []byte allocate memory?](#q8-when-would-converting-string--byte-allocate-memory)

**[Common traps](#common-traps)**

- [Q1. When can `err == nil` be false even though you assigned a nil pointer to error?](#q1-when-can-err--nil-be-false-even-though-you-assigned-a-nil-pointer-to-error)
- [Q2. Can you take the address of `m["k"]`? What happens if two goroutines write to the same map without synchronization?](#q2-can-you-take-the-address-of-mk-what-happens-if-two-goroutines-write-to-the-same-map-without-synchronization)
- [Q3. What is shared between `s1 := s[:]` and the original slice? What does append do with capacity?](#q3-what-is-shared-between-s1--s-and-the-original-slice-what-does-append-do-with-capacity)
- [Q4. Why did people copy the loop variable before spawning goroutines in the loop body? What changed in Go 1.22+?](#q4-why-did-people-copy-the-loop-variable-before-spawning-goroutines-in-the-loop-body-what-changed-in-go-122)
- [Q5. How would you detect a data race in tests or CI?](#q5-how-would-you-detect-a-data-race-in-tests-or-ci)
- [Q6. When would you use `sync.Map` instead of map protected by `sync.RWMutex`?](#q6-when-would-you-use-syncmap-instead-of-map-protected-by-syncrwmutex)

**[Methods and embedding](#methods-and-embedding)**

- [Q1. Method sets: value vs pointer receivers — when do you choose each?](#q1-method-sets-value-vs-pointer-receivers--when-do-you-choose-each)
- [Q2. How does embedding a struct/type affect the promoted methods and fields?](#q2-how-does-embedding-a-structtype-affect-the-promoted-methods-and-fields)
- [Q3. If you embed a type with unexported methods, what appears on the outer type?](#q3-if-you-embed-a-type-with-unexported-methods-what-appears-on-the-outer-type)
- [Q4. Is embedding the same as inheritance in OOP languages?](#q4-is-embedding-the-same-as-inheritance-in-oop-languages)

**[defer](#defer)**

- [Q1. In what order do deferred calls run when a function returns?](#q1-in-what-order-do-deferred-calls-run-when-a-function-returns)
- [Q2. When are the arguments to a deferred call evaluated? (Когда рассматриваются аргументы в пользу отложенного звонка?)](#q2-when-are-the-arguments-to-a-deferred-call-evaluated-когда-рассматриваются-аргументы-в-пользу-отложенного-звонка)
- [Q3. Is defer free? Any concerns in a tight loop? Является ли defer бесплатным? Есть ли проблемы при использовании в тесном цикле?](#q3-is-defer-free-any-concerns-in-a-tight-loop-является-ли-defer-бесплатным-есть-ли-проблемы-при-использовании-в-тесном-цикле)

**[Concurrency and channels](#concurrency-and-channels)**

- [Q1. Goroutine vs OS thread — what does the Go runtime schedule?](#q1-goroutine-vs-os-thread--what-does-the-go-runtime-schedule)
- [Q2. Buffered vs unbuffered channels: what happens on send and receive?](#q2-buffered-vs-unbuffered-channels-what-happens-on-send-and-receive)
- [Q3. How do you use select for timeouts, cancellation, and fan-in?](#q3-how-do-you-use-select-for-timeouts-cancellation-and-fan-in)
- [Q4. What is context.Context for? When is context.Value appropriate vs discouraged?](#q4-what-is-contextcontext-for-when-is-contextvalue-appropriate-vs-discouraged)
- [Q5. sync.Mutex, RWMutex, Once, WaitGroup, errgroup — pick one and describe a real use case.](#q5-syncmutex-rwmutex-once-waitgroup-errgroup--pick-one-and-describe-a-real-use-case)
- [Q6. Who should close a channel? What happens if you send on a closed channel or receive after close?](#q6-who-should-close-a-channel-what-happens-if-you-send-on-a-closed-channel-or-receive-after-close)
- [Q7. Design a worker pool: how do you stop workers cleanly?](#q7-design-a-worker-pool-how-do-you-stop-workers-cleanly)
- [Q8. How would you explain happens-before to a junior in the context of a mutex?](#q8-how-would-you-explain-happens-before-to-a-junior-in-the-context-of-a-mutex)
- [Q9. When is a channel the wrong tool?](#q9-when-is-a-channel-the-wrong-tool)

**[Mini scenario (optional live coding topic)](#mini-scenario-optional-live-coding-topic)**

- [Q10. Ask the candidate to sketch (on paper) a pipeline: producer → N workers → aggregator with cancellation on Context.](#q10-ask-the-candidate-to-sketch-on-paper-a-pipeline-producer--n-workers--aggregator-with-cancellation-on-context)

---

## Types: simple and composite

### Q1. Walk through Go’s numeric types: when would you pick int vs int64, float32 vs float64?

**Concept:** Go has fixed-width integers (`int8` … `int64`, unsigned `uint*` including `uintptr`), platform-width `int`/`uint`, and `float32`/`float64`, `complex64`/`complex128`, and `byte` (alias for `uint8`) / `rune` (alias for `int32` for Unicode code points).

**For you as interviewer:** `int` is either 32 or 64 bits **depending on the platform** — fine for local counters and array indexing. Use `int64` when an API, file format, or protocol fixes the width (Unix nanoseconds, file offsets, explicit JSON fields). Use `uint` or `uintptr` only with clear intent (bit masks, unsafe/interop). `float64` is the default floating type; `float32` saves memory in huge numeric arrays but loses precision. Strong candidates mention *domain* constraints (money as integer minor units or decimal, not raw floats; avoiding equality on floats).

**Weak answers:** “always int”; confusion between `int` and `int64` on 32-bit vs 64-bit when serializing to JSON or wire formats.

* Bit (бит) — минимальная единица информации. Может иметь только два значения: 0 или 1.
* Byte (байт) — группа из 8 битов.

* int8  = 8 bits  = 1 byte
* int16 = 16 bits = 2 bytes
* int32 = 32 bits = 4 bytes
* int64 = 64 bits = 8 bytes

| Type | When to Use | Real-World Example |
|---|---|---|
| `int` | Обычные целые числа внутри приложения | User count, page number, array index |
| `int64` | Большие числа или когда контракт требует 64 бита | Timestamp, file size/offset, ID from an API |
| `uint` | Когда работаешь с битовыми флагами/масками | Permissions: read/write/admin |
| `uintptr` | Низкоуровневая работа с адресами памяти | `unsafe`, C interoperability |
| `float64` | Обычные дробные вычисления | Temperature, coordinates, average value |
| `float32` | Огромные массивы чисел, где важна память | Machine learning, images, scientific data |
| `int64` for money | Деньги в минимальных единицах | $19.99 → 1999 cents |

---

### Q2. What is the zero value of a pointer, slice, map, channel, interface, struct?

**Concept:** In Go, every type has a **zero value** — the value a variable holds if you do not initialize it.

**By type:** pointers, slices, maps, channels, interfaces, and function values are `nil`. Structs zero **field by field**. Arrays zero every element. `bool` is `false`; numbers are `0`.

**Critical trap — maps:** `var m map[string]int` is a **nil map**. Reading a missing key returns the zero value, but writing (`m["k"] = 1`) **panics**. You must `make(map[...])` or use a composite literal. **Slices**: a nil slice has `len/cap 0` and is safe to pass to `append` (it allocates a backing array on first append). **Channels**: a nil channel **always blocks** on send and receive — sometimes used deliberately in `select` to disable a case.

**What to listen for:** candidate distinguishes nil **slice** (usable) vs nil **map** (not writable) vs nil **channel** (blocks).

| Тип | Zero value | Что с ним можно |
|---|---|---|
| Указатель (`*T`) | `nil` | Разыменование `*p` → panic |
| Слайс (`[]T`) | `nil` | Читать/`append`/`range`/`len` — ок; `len/cap` = 0 |
| Map (`map[K]V`) | `nil` | Читать — ок (zero value); писать `m[k]=v` → panic |
| Канал (`chan T`) | `nil` | Send/receive блокируются **навсегда** |
| Интерфейс | `nil` | Вызов метода → panic (если нет typed nil, см. Q1 из "err == nil") |
| Функция | `nil` | Вызов `f()` → panic |
| Структура (`struct`) | Каждое поле — zero value своего типа | Использовать сразу можно, не паникует |
| `bool` | `false` | — |
| Числа (`int`, `float64`, ...) | `0` | — |
| Строка (`string`) | `""` | — |
| Массив (`[N]T`) | Каждый элемент — zero value | Использовать сразу можно |

---

### Q3. How does string relate to []byte and []rune? When is conversion copying?

**Concept:** A Go string is an **immutable** read-only slice of bytes; the convention is that those bytes are **valid UTF-8** (the language does not enforce validity at compile time). `[]byte` is a **mutable** byte slice; `[]rune` is a slice of Unicode code **points** (runes).

**Copying:** Converting `string → []byte` or `[]byte → string` typically **allocates and copies** the payload (the compiler can sometimes optimize away copies in narrow cases). `range` **on a string** walks **runes** (decodes UTF-8 on the fly), not raw bytes.

**Indexing:** `s[i]` returns the **i-th byte**, not the i-th character — for non-ASCII text this is easy to get wrong. `len(s)` is the **byte length**, not the number of characters.

**For you:** Strong candidates explain byte vs rune count, invalid UTF-8 handling, and that strings cannot be mutated in place (build new strings). Weak: “string equals `[]byte`” or ignoring UTF-8 when discussing `len` and indexing.

| | `string` | `[]byte` | `[]rune` |
|---|---|---|---|
| Можно менять? | ❌ нет | ✅ да | ✅ да |
| `len()` считает | байты | байты | руны (символы) |
| `s[i]` возвращает | 1 байт | 1 байт | 1 rune (символ) |
| `for range` возвращает | rune (символ) | байт | rune (символ) |

**Пример на конкретной строке** (`é` — не-ASCII символ, занимает 2 байта, но это 1 rune):
```go
s := "café"
fmt.Println(len(s))          // 5  — байты: c,a,f,é(2 байта)
fmt.Println(len([]rune(s)))  // 4  — символы: c,a,f,é

fmt.Println(s[3])            // 195 — это ПЕРВЫЙ байт символа é, не сам символ!

for i, r := range s {
    fmt.Println(i, string(r))  // 0 c / 1 a / 2 f / 3 é
}                                // индекс é прыгает сразу на 3, а не 4 —
                                  // range умеет пропускать многобайтовые руны целиком
```
Отсюда правило: если нужно работать с **символами** (пользовательский текст, длина строки для UI) — конвертируйте в `[]rune`. Если нужны сырые **байты** (сеть, файлы, хеши) — используйте `[]byte` напрямую, без конвертации в rune.

---

### Q4. What are named types vs type aliases? (`type UserID int` vs `type UserID = int`)

**Named type:** `type UserID int` declares a **new** type with the same **underlying** type `int`. Values of `UserID` and `int` are **not interchangeable** — you need explicit conversion `UserID(42)` or `int(u)`. Methods attach to the named type; you can define methods on `UserID` but not on plain `int`.

**Type alias:** `type UserID = int` means `UserID` is **exactly** `int` — no new type, no extra conversions. Used for gradual refactoring, large generated code, or embedding APIs that must spell the same type.

**For you:** If the candidate conflates alias and named type, drill with “can I pass `UserID` where `int` is expected?” (named type: no without conversion; alias: yes).

type UserID int
* ✅ Создает новый тип с базовым типом int.
* ❌ Нельзя передавать туда, где ожидается int, без явного преобразования.
* ✅ Можно добавлять свои методы.
* Используется: для повышения type safety, чтобы не перепутать разные сущности (UserID, ProductID, OrderID).

type UserID = int
* ✅ Это не новый тип, а второе имя для int.
* ✅ Можно свободно передавать вместо int и наоборот.
* ❌ Методы добавлять нельзя.
* Используется: при рефакторинге, переносе типов между пакетами, сохранении обратной совместимости API.

---

### Q5. If you compare two values of different named types both based on string, does it compile?

**Rule:** In Go, `==` and `!=` are allowed only when the compiler can prove safety. Two **named types** `type T string` and `type U string` have the **same underlying type** (`string`) but are **different named types**, so **direct comparison does not compile** unless you convert: `string(t) == string(u)` or compare after converting both to `string`.

**For you:** This question tests named types vs underlying types, not “knowing string comparison.” A candidate who says “yes, they compare” is wrong; one who explains conversion or `strings.EqualFold` after converting shows precision.

---

### Q6. Why is `var s []int` a nil slice and `len(s) == 0` still valid — and can you append to `s`?

**Semantics:** A nil slice has **length 0** and **capacity 0**; `len` and `cap` are defined and do not panic. `append` on a nil slice allocates a new backing array and returns a **non-nil** slice header pointing at it.

`var s []int` vs `s := []int{}` vs `make([]int, 0)`: all represent “empty” length-0 slices; the first has `s == nil` (`true`), the second is a non-nil header to an empty backing array (`s == nil` is `false`). This matters for APIs that distinguish **JSON** `null` vs `[]` or for `reflect.DeepEqual`. **You can always append to a nil slice**.

**For you:** Candidate should not claim “nil slice is unusable” — the opposite is true for `append`/`len`/`range`.

---

### Q7. Is a Go string mutable? How does UTF-8 relate to indexing a string with `s[i]`?
Изменяема ли строка в Go? Как UTF-8 связан с индексацией строки через `s[i]`?

**Immutability:** Go strings cannot be modified in place; “update” means allocating a new string (often via `[]byte` builders, `strings.Builder`, or concatenation patterns the compiler optimizes).

**Indexing vs characters:** `s[i]` is a byte **(`uint8`)**. Multi-byte UTF-8 code points span several indices; `for i, r range s` gives runes. `utf8.DecodeRuneInString` and friends handle invalid UTF-8 without breaking the whole program if used correctly.

**For you:** A good answer mentions **byte vs rune, invalid UTF-8**, and `Builder` for efficient concatenation in loops. Weak: treating `len` as “number of letters.”

| Вопрос | Ответ |
|---|---|
| Строка изменяема? | ❌ Нет, `string` в Go immutable — "изменить" значит создать новую строку |
| Как обновить содержимое? | Через `[]byte` / `strings.Builder` / конкатенацию — компилятор оптимизирует частые случаи |
| Что возвращает `s[i]`? | 1 **байт** (`uint8`), не символ |
| Что возвращает `for i, r := range s`? | **rune** — range сам декодирует UTF-8 |
| Многобайтовый символ (например `é`) | Занимает несколько индексов в `s[i]`, но 1 rune в `range` |
| Невалидный UTF-8 | Не ломает программу — `s[i]`/`range` продолжают работать, `utf8.DecodeRuneInString` даёт `RuneError` для битых байтов |
| `len(s)` считает | Байты, не символы |

---

### Q8. When would converting string ↔ []byte allocate memory?

**Rule of thumb:** `string ↔ []byte` conversions usually copy the underlying bytes so that mutating the byte slice cannot corrupt the string’s immutability guarantee.

**Optimizations:** The compiler may **eliminate** some copies when the `[]byte` does not escape (implementation-dependent). Candidates who say “measure with bench / allocs” are credible. `unsafe` + `unsafe.Slice` or similar tricks to avoid copy exist but are not idiomatic for application code.
Компилятор может убрать копирование, если []byte используется только внутри текущей функции и не “убегает” (не возвращается, не сохраняется и не передается дальше). Это лишь оптимизация компилятора, она зависит от реализации и не гарантируется спецификацией Go.

**For you:** Accept “usually copies” plus awareness that microbenchmarks matter for hot paths.

---

## Common traps

### Q1. When can `err == nil` be false even though you assigned a nil pointer to error?

**How interfaces are stored:** An interface value holds a **type descriptor** (`itab` or similar for concrete type) and a **data word** (value pointer). **Interface is nil** only when both the type and value are **“empty”** in the sense of no concrete type.

**The trap:** `var p *MyError = nil` then `var err error = p` — the **interface** `err` is **non-nil** because the type `*MyError` is stored, even though the **pointer value** is nil. So `err == nil` is **false**, yet `fmt.Println(err)` may print `<nil>` (confusing). **Fix**: return `nil` as `error` without a typed nil pointer, or return `error` without assigning a typed nil to a wider interface incorrectly.

**For you:** If the candidate has never heard of this, they may lack production debugging experience with error handling. If they explain `itab` vs concrete nil at depth, that is senior-level.

**Что такое `error` на самом деле:** это интерфейс, а любая переменная интерфейса внутри хранит **две вещи**: какой конкретно тип в неё положили и само значение. `err == nil` — это проверка "обе части пустые". Если тип записан (пусть даже значение внутри — nil-указатель), то интерфейс **не пустой**, и `err == nil` будет `false`.

```go
type MyError struct{}
func (e *MyError) Error() string { return "boom" }

func doSomething() error {
    var p *MyError = nil   // p — обычный nil-указатель
    return p                // ⚠️ кладём указатель в error
}

func main() {
    err := doSomething()
    fmt.Println(err == nil)   // false! хотя p был nil
}
```

Почему так: `return p` кладёт в `error` **тип** `*MyError` (он есть, компилятор его знает) и **значение** `nil`. Получилась пара `(*MyError, nil)` — а это уже не то же самое, что "пустой" `error`, у которого нет вообще ни типа, ни значения. Поэтому сравнение с `nil` (которое проверяет пустоту **обеих** частей) даёт `false`.

---

### Q2. Can you take the address of `m["k"]`? What happens if two goroutines write to the same map without synchronization?

**Address of map value:** `&m["k"]` is **invalid** — map values are not addressable (the implementation may move entries during growth; the address would not stay stable). Workaround: copy into a variable, take address of the variable, or `m["k"]` read-modify-write.

**Concurrent access:** The language says: **one goroutine must not write** while **others read or write** without synchronization — **undefined behavior** (runtime may panic with “concurrent map writes”). **Safe patterns**: one writer goroutine; or map + `sync.Mutex`/`RWMutex`; or `sync.Map` for specific access patterns; or map accessed only from one goroutine with channels for all mutations.

**For you:** Candidate should not say “map is safe if I only read” while another goroutine writes — **reads concurrent with writes** are also unsafe unless documented otherwise (e.g. single writer in docs).

| Вопрос | Ответ |
|---|---|
| Можно взять `&m["k"]`? | ❌ Нет — compile error, map values are not addressable |
| Почему нельзя? | При росте map элементы физически перемещаются в памяти — адрес не был бы стабильным |
| Как обойти | Скопировать значение в переменную и брать адрес переменной, либо read-modify-write через `m["k"] = ...` |
| Много читателей без писателя | ✅ Безопасно |
| 1 писатель + читатели без синхронизации | ❌ Небезопасно — undefined behavior, возможен `fatal error: concurrent map writes` |
| 1 писатель + другие писатели без синхронизации | ❌ Небезопасно, то же самое |
| Как сделать безопасно | Один writer-горутина; `sync.Mutex`/`RWMutex`; `sync.Map`; либо все изменения только через канал в одну горутину |
Для безопасной работы используют:
* sync.Mutex / sync.RWMutex;
* sync.Map;
* одну горутину-владельца map и каналы для всех изменений.

---

### Q3. What is shared between `s1 := s[:]` and the original slice? What does append do with capacity?

**Slice header:** A slice is a small struct: **pointer** to backing array, **length, capacity**. `s1 := s[:]` shares the **same backing array** and usually the same length/cap (unless resliced). `s1[i] = x` modifies `s[j]` if `i` and `j` alias the same element.

**append:** If `len` grows past `cap`, Go allocates a new array, copies old elements, and the returned slice may no longer share storage with `s`. If `append` fits in `cap`, storage stays shared — subtle bugs when two slices append “independently”.

**Independence:** Use `copy()` into a new slice, or `append([]T(nil), s...)`, or slice expressions with explicit bounds.

**For you:** Strong candidates explain aliasing and append reallocation; weak ones think `s1 := s` always copies data.

---

### Q4. Why did people copy the loop variable before spawning goroutines in the loop body? What changed in Go 1.22+?

**Historical bug (before Go 1.22):** The `for` loop’s range variable (`v` or `i`) was reused for each iteration; a closure (e.g. goroutine or deferred func) captured the variable, not the value — so async work often observed the last iteration’s value. Fix: `v := v` inside the loop body (creates a new per-iteration variable).

**Go 1.22+:** Per-iteration loop variables are the default — the classic closure bug is **fixed for new loops** (see release notes). `GOEXPERIMENT` / legacy loop variable behavior is not something most candidates need.

**For you:** If the candidate only knows the old workaround, they likely maintained pre-1.22 code. If they cite 1.22, they keep up with language changes.

**До Go 1.22** Переменная цикла (v, i) была одной на все итерации. Замыкание (goroutine, defer) захватывало переменную, а не ее значение, поэтому часто выводилось последнее значение.
**Начиная с Go 1.22** Go автоматически создает новую переменную для каждой итерации, поэтому v := v больше не нужен — классическая ошибка с замыканием исправлена.
Для интервью:
* До Go 1.22 → использовали v := v.
* С Go 1.22 → Go делает это автоматически.

---

### Q5. How would you detect a data race in tests or CI?

**Race detector:** The Go runtime can instrument builds with `-race` (`go test -race`, `go build -race`). It detects **unsynchronized** concurrent access to memory, with a **stack trace** when a race is found. **Cost**: ~5–10× CPU/memory slowdown — use in CI and tests, not always in production binaries (there are separate profiling tools for prod).

**Other signals:** Static analysis (`go vet`), careful code review of shared mutable state, **TSAN**-style thinking, reproducing under load.

**For you:** A good answer names `-race`, CI integration, and that races are undefined behavior even if “usually works.” Weak: “we don’t have races” without a process.

Хороший кандидат упоминает:
* go test -race — встроенный детектор гонок данных.
* Интеграцию с CI — запуск -race автоматически в GitHub Actions, GitLab CI, Jenkins и т.д.
* Что data race — это неопределенное поведение (undefined behavior). Даже если программа “обычно работает”, это не значит, что она правильная.

- go test -race ./... → detect data races
- go vet ./...        → static analysis
- CI                   → run both

---

### Q6. When would you use `sync.Map` instead of map protected by `sync.RWMutex`?

**What it is:** `sync.Map` is a **concurrent map** in the standard library (`sync` package). It is **not** a drop-in replacement for map + one mutex. It uses a specialized design (roughly: a **read** map for lock-free-ish hot reads and a **dirty** map for entries that were written, plus internal bookkeeping) so that read-heavy workloads with some write patterns avoid taking a global `RWMutex` on every read.

**API you should expect a candidate to know:** `Load`, `Store`, `Delete`, `LoadOrStore`, `LoadAndDelete`, `Range`, and in newer Go versions `Swap`, `CompareAndSwap`, `CompareAndDelete`. Everything takes `interface{}` keys/values — you lose compile-time type safety compared to `map[K]V`.

**When the Go docs say it shines:**

1. The entry for a given key is only ever written once but read many times, e.g. a growing cache of immutable objects.
2. Many disjoint goroutines read, write, and overwrite entries for distinct sets of keys (little contention on the same key).

In those patterns it can reduce mutex contention compared to one big `RWMutex` around a plain map.

**When it is usually the wrong tool:** a general-purpose shared map with arbitrary read/write ratios; workloads where keys churn constantly (many inserts/deletes); need for simple reasoning (“one mutex protects one map”); small programs where benchmarks show map + `RWMutex` wins. The zero value is ready to use, but wrong usage (e.g. calling `Range` with heavy work inside the callback, or using it like a normal map everywhere) can perform worse than a single mutex.

**Range caveat:** `Range` calls the callback while holding state; long-running callbacks block other operations — good candidates mention not doing I/O inside `Range` or holding locks while iterating.

**What a strong answer sounds like:** names concrete access patterns, compares to map+`Mutex`/`RWMutex`, admits that benchmarks decide, and does not claim `sync.Map` is “faster” in general.

**A weak answer:** “it’s concurrent so it’s better” or treating it as a synonym for map.


sync.Map — это потокобезопасная структура данных из пакета sync, предназначенная для хранения пар «ключ–значение». Она предоставляет API, похожий на обычную map, но сама обеспечивает безопасный конкурентный доступ из нескольких горутин.
Это **не замена** обычной `map + sync.Mutex/RWMutex`. Внутри используется специальная реализация (отдельные структуры для чтения и записи), благодаря которой она эффективна в определенных сценариях с большим количеством чтений.
**Основные методы**
- `Load(key)` — получить значение.
- `Store(key, value)` — сохранить значение.
- `Delete(key)` — удалить значение.
- `LoadOrStore(key, value)` — получить существующее или сохранить новое.
- `LoadAndDelete(key)` — получить и удалить значение.
- `Range(func)` — перебрать элементы.
В новых версиях Go:
- `Swap()`
- `CompareAndSwap()`
- `CompareAndDelete()`
⚠️ Все методы принимают `any` (`interface{}`), поэтому теряется **проверка типов на этапе компиляции** по сравнению с `map[K]V`.

| Критерий | `sync.Map` | `map` + `sync.RWMutex` |
|---|---|---|
| Профиль доступа | Запись один раз, чтений очень много (кэш неизменяемых объектов) | Чтений и записей примерно поровну |
| Ключи | Разные горутины работают с разными ключами, конкуренции почти нет | Одни и те же ключи, конкуренция за них частая |
| Churn (добавление/удаление ключей) | Плохо подходит при постоянном churn | Подходит хорошо |
| Типобезопасность | ❌ `any`-ключи/значения, нет compile-time проверки | ✅ `map[K]V`, типизировано |
| Простота кода | Сложнее, специфичный API (`Load`/`Store`/...) | Проще — "один mutex защищает одну map" |
| Производительность | Может быть быстрее именно в read-heavy паттернах — но не гарантированно | Часто быстрее в общем случае; базовый выбор |
| Когда выбрать | Только под конкретный паттерн выше, и после бенчмарка | По умолчанию, пока бенчмарк не покажет обратное |

**Особенность `Range`**
Не выполняйте внутри `Range` долгие операции (HTTP, БД, I/O, длительные вычисления), так как это может замедлить работу `sync.Map`.

## Methods and embedding

### Q1. Method sets: value vs pointer receivers — when do you choose each?

**Pointer receivers** `func (t *T) M()`: Use when the method mutates `t`, when `T` is large (avoid copying on every call), or when `T` contains non-copyable fields (`sync.Mutex`, `sync.WaitGroup`, `atomic.*`, etc.) — copying those is either wrong or a bug.

**Value receivers** `func (t T) M()`: Fine for small, immutable values (`Point` with two floats). Each call gets a copy of `t`.

**Method sets and interfaces:** The method set of `T` includes only value-receiver methods; the method set of `*T` includes both value and pointer receiver methods. If an interface is implemented only by `*T`, storing a value `T` in that interface can fail silently (empty method set) — a common interview edge case.

**For you:** Listen for mutability, size, mutex, and interface satisfaction.

**Шаг 1 — быстрое решение, value или pointer:**

| Критерий | `func (t T) M()` value | `func (t *T) M()` pointer |
|---|---|---|
| Метод меняет поля `t`? | ❌ Нет — работает с копией, изменения не видны снаружи | ✅ Да — меняет оригинал |
| Размер типа | Маленький, копия дешёвая (`Point{x, y float64}`) | Большой — копировать на каждый вызов дорого |
| Есть `sync.Mutex`/`sync.WaitGroup`/`atomic.*` внутри | ❌ Нельзя — копирование сломает/обессмыслит их | ✅ Нужно — эти типы **нельзя** копировать |

**Шаг 2 — почему это ещё и вопрос про интерфейсы, а не только про стиль.** Ниже — по порядку: что такое Method Set, почему `u.Hello()` работает несмотря на него, и как из-за него можно неожиданно не реализовать интерфейс.

**Что такое Method Set:** это набор методов, формально принадлежащих типу. Компилятор использует его **в одном конкретном месте** — при проверке, реализует ли тип интерфейс. Он почти не участвует в том, скомпилируется ли обычный вызов `u.Method()` — для вызовов действует отдельное, более мягкое правило (см. Шаг 3).

Если метод объявлен с **value receiver**:
```go
func (u User) Hello() {}
```
- `User` имеет метод `Hello()`.
- `*User` тоже имеет метод `Hello()` (у `*T` в Method Set всегда попадают оба варианта).

Если метод объявлен с **pointer receiver**:
```go
func (u *User) Hello() {}
```
- `User` **не имеет** метода `Hello()` (формально, для целей интерфейсов).
- `*User` имеет метод `Hello()`.

**Шаг 3 — почему тогда `u.Hello()` вообще компилируется, если у `User` нет `Hello()` в Method Set?**
```go
u := User{}
u.Hello()
```
Здесь работает **не Method Set**, а отдельное синтаксическое правило: если `u` — **адресуемое** значение (обычная переменная, разыменованный указатель, поле адресуемой структуры), компилятор сам переписывает вызов:
```go
(&u).Hello()
```
Это называется **автоматическое взятие адреса**, и оно работает **только при прямом вызове метода на адресуемом значении** — Method Set тут ни при чём.

**Когда авто-взятие адреса не срабатывает**
Если значение **не адресуемо**, компилятор `&` подставить не может — и вызов не скомпилируется, даже без всяких интерфейсов:
```go
User{}.Hello()                       // ❌ композитный литерал не адресуем

m := map[string]User{"a": {}}
m["a"].Hello()                       // ❌ элемент map не адресуем
                                      //    (Go может в любой момент переместить его в памяти)
```

**Почему интерфейсы работают иначе?**
```go
type Speaker interface {
    Hello()
}

type User struct{}

func (u *User) Hello() {}
```
Это не скомпилируется:
```go
var s Speaker
u := User{}
s = u // ❌ User does not implement Speaker (Hello has pointer receiver)
```
Разберём построчно:
- `var s Speaker` — объявили переменную `s` типа `Speaker`. Пока в неё ничего не положили, её значение — nil-интерфейс (пустая пара тип+значение).
- `u := User{}` — обычная переменная типа `User` (не указатель).
- `s = u` — пытаемся положить `u` (тип `User`) в переменную интерфейсного типа `Speaker`. Именно на этом шаге компилятор проверяет: "а входит ли `Hello()` в Method Set типа `User`?" — и не находит его там (`Hello()` объявлен с pointer receiver, значит принадлежит только `*User`). Компиляция падает **до** выполнения программы — это не runtime-ошибка, а ошибка на этапе `go build`.

При присваивании в интерфейс Go **не берёт адрес автоматически** — неважно, что переменная `u` вполне адресуема. Компилятор проверяет только формальный **Method Set** типа `User`, а у `User` метода `Hello()` в нём нет.

Правильно:
```go
s = &u // ✅ *User — Method Set содержит Hello()
```

Логика такого разделения понятна: присваивание в интерфейс копирует значение в интерфейсную "коробку" `(тип, значение)`. Если бы Go молча брал `&u`, при последующих вызовах через интерфейс менялся бы адрес временной копии, а не оригинальный `u` — поведение было бы обманчивым. Поэтому для pointer-receiver методов интерфейсу нужно явно отдавать указатель.

**Итог — два разных правила компилятора:**

| Ситуация | Что решает, скомпилируется ли |
|---|---|
| `u.Hello()`, `u` — переменная | Адресуема ли `u`? Method Set тут не важен |
| `User{}.Hello()`, `m["k"].Hello()` | Не адресуемы → ошибка, независимо от Method Set |
| `var s Speaker = u` | Есть ли `Hello()` в Method Set типа `User`? Адресуемость `u` тут не важна |

Отсюда практический вывод: если у типа есть хоть один pointer-receiver метод, `T` **не может** реализовать интерфейс с этим методом — только `*T`. Это не стиль, а требование языка, выбора тут нет. Поэтому на практике проще не смешивать receivers на одном типе: раз тип уже обязан "жить как указатель" для интерфейсов, удобнее и в обычном коде везде работать с `*T`.

---

### Q2. How does embedding a struct/type affect the promoted methods and fields?
Что происходит с методами и полями встроенного типа при embedding? Какие из них становятся доступны через внешнюю структуру?

**Syntax:** `type Outer struct { Inner }` embeds `Inner` (anonymous field). **Promoted** fields and methods appear as if they were on `Outer`: `Outer.Foo()` can call `Inner`’s `Foo` without naming `Inner` explicitly.

**Not inheritance:** There is **no** virtual method table or dynamic dispatch up a class hierarchy. If `Outer` and `Inner` both define `Foo`, **outer wins** for `outer.Foo()` (outer shadows inner). Method promotion still passes the **inner** receiver to inner methods when invoked through promotion — details matter for people embedding pointers vs values.

**Embedding pointer vs value:** embed `*Inner` vs embed `Inner` changes nil behavior and copying — strong candidates may mention this for API design.

**For you:** Good answers stress composition and name shadowing; weak answers describe “subclassing.”

`type Outer struct { Inner }` встраивает `Inner` как анонимное поле — все его поля и методы **продвигаются** на `Outer`: `o.Foo()` работает, даже если `Foo()` объявлен на `Inner`, без явного `o.Inner.Foo()`.

Это **не наследование**: нет vtable и динамической диспетчеризации. Если `Foo()` есть и у `Outer`, и у `Inner` — `o.Foo()` вызывает версию `Outer` (внешний **затеняет** внутренний, а не переопределяет). При этом receiver внутри promoted-метода всё равно `Inner` (или `*Inner`) — метод не видит остальных полей `Outer`.

**Указатель vs значение при embedding** влияет на nil-safety и копирование:
```go
type Engine struct {
    HP int
}

func (e *Engine) Start() {
    fmt.Println("Engine starting, HP:", e.HP)
}

type Car struct {
    *Engine   // embedding УКАЗАТЕЛЯ, а не самого Engine
}
```
```go
var car Car     // zero value: поле *Engine == nil, никакого Engine внутри нет
car.Start()      // promoted-вызов раскрывается в car.Engine.Start()
                  // car.Engine == nil -> panic: nil pointer dereference

car = Car{Engine: &Engine{}}   // явно создали Engine{} и положили его адрес
car.Start()                     // ok — car.Engine теперь указывает на реальный объект
```
Если вместо `*Engine` встроить значение `Engine` — такой проблемы нет: zero value структуры это не `nil`, а `Engine{HP: 0}`, она создаётся автоматически вместе с `Car`, инициализировать отдельно не нужно.

Разница проявляется и при копировании `car2 := car`:

| | embedding `*Engine` | embedding `Engine` |
|---|---|---|
| Нужна инициализация? | Да, иначе `nil` → panic при вызове метода | Нет, создаётся сама |
| Копирование `Car` | `car2.Engine` — **тот же** указатель, что и у `car` (расшарен, изменения видны в обоих) | `car2.Engine` — **независимая копия** |

Для интервью: хороший ответ — «композиция, не наследование», + shadowing по имени. Плохой — «это как extends в Java/подклассы».

---

### Q3. If you embed a type with unexported methods, what appears on the outer type?

*Речь именно про методы встроенного типа: у `Inner` есть метод `helper()` с маленькой буквы (неэкспортируемый) — вопрос в том, "продвинется" ли он на `Outer`, и кто сможет его вызвать.*

**Visibility:** Methods and fields are promoted according to export rules: an exported outer type can expose exported promoted methods from an embedded type. Unexported embedded types still participate in promotion *within the same package*; from other packages you only see what is exported through the outer type’s API.

**For you:** You are not testing memorization of spec corner cases — listen for “promotion is not magic export” and that embedding unexported helpers is a common pattern for reuse inside a package.

**Главное правило:** embedding **не меняет** правила экспорта Go — видимость решает только регистр первой буквы имени метода, а не то, объявлен он напрямую на `Outer` или продвинут через embedding.

```go
package pkg

type Inner struct{}

func (i Inner) Public() {}   // экспортируемый
func (i Inner) helper() {}   // неэкспортируемый

type Outer struct {
    Inner
}
```
- **Внутри пакета `pkg`**: `helper()` продвигается на `Outer` так же, как и `Public()` — promotion работает независимо от регистра имени. Код внутри `pkg` может написать `outer.helper()`.
- **Из другого пакета** (`import "pkg"`): `outer.Public()` работает, а `outer.helper()` — нет, компилятор скажет "undefined" — как и с любым другим неэкспортируемым идентификатором.

Как это выглядит при вызове из другого пакета:
```go
package main

import "pkg"

func main() {
    o := pkg.Outer{}

    o.Public()   // ✅ ok — экспортируемый метод, доступен снаружи
    o.helper()   // ❌ compile error: o.helper undefined (cannot refer to
                  //    unexported field or method pkg.Inner.helper)
}
```

Это частый паттерн: встраивать тип с набором внутренних неэкспортируемых helper-методов для переиспользования логики внутри пакета, не раскрывая их наружу через публичный API.

---

### Q4. Is embedding the same as inheritance in OOP languages?

**Expected position:** Embedding is structural composition: the outer type contains the inner; promoted calls are compiler sugar, not subtype polymorphism. There is no built-in `super` or virtual override chain.

**Optional nuance:** Interfaces still give runtime polymorphism — but that is interface satisfaction, not “embedding-as-inheritance.”

**For you:** A “yes, it’s like Java extends” answer is a red flag for Go idioms.

Ответ: **нет**. Embedding — это композиция (внешняя структура содержит внутреннюю), а не наследование. Method promotion — удобство компилятора, а не полиморфизм: в Go нет `super`, виртуальных методов и цепочки `override`, как в Java/C++.

Тонкость: полиморфизм в Go есть, но достигается через **интерфейсы** (реализация контракта), а не через embedding — то, что одна структура содержит другую, само по себе никакого динамического полиморфизма не даёт.

Для интервью: ответ «да, это как extends в Java» — тревожный сигнал, показывает непонимание идиом Go.

**Столпы ООП и Go**

| Столп ООП | Есть в Go? | Как реализован |
|-----------|:----------:|----------------|
| Инкапсуляция (Encapsulation) | ✅ | Экспортируемые/неэкспортируемые поля и методы |
| Наследование (Inheritance) | ❌ | Вместо него композиция (Embedding) |
| Полиморфизм (Polymorphism) | ✅ | Интерфейсы |

---

## defer

### Q1. In what order do deferred calls run when a function returns?

**Order:** Deferred functions run last in, first out (stack order) when the surrounding function returns or panics. If the function panics, deferred functions still run during unwind; `recover()` can be used in a deferred closure to catch panics in the same goroutine.

**For you:** Candidate should not say FIFO. Mentioning interaction with `panic`/`recover` is a plus.

Нюанс: `recover()` работает, только если вызван **напрямую** в теле `defer func() {...}()`, на уровень глубже (в функции, которую вызвал defer) — не сработает.

---

### Q2. When are the arguments to a deferred call evaluated? (Когда рассматриваются аргументы в пользу отложенного звонка?)

**Evaluation:** The arguments to the deferred call are evaluated when `defer` runs (at registration time), not when the deferred function executes at return. Example: `defer f(trace())` runs `trace()` immediately.

**Closures:** `defer func() { ... i ... }()` captures variables by reference — loop variable pitfalls apply to closures inside `defer` in older Go versions. `defer f(i)` evaluates `i` at defer statement time.

**For you:** Distinguish argument evaluation vs closure capture — strong candidates get this right.
Вычисление аргументов: Аргументы функции, вызываемой через defer, вычисляются в момент выполнения инструкции defer, а не при фактическом выполнении отложенной функции. Например, defer f(trace()) — функция trace() выполнится сразу.
Замыкания (closures): Замыкание defer func() { ... i ... }() захватывает переменную i, поэтому используется её значение на момент выполнения замыкания. В отличие от этого, defer f(i) вычисляет и сохраняет значение i сразу при выполнении defer.
Для интервью: Важно различать вычисление аргументов defer и захват переменных замыканием.

**Кейс 1 — аргумент вычисляется сразу, вызов откладывается:**
```go
func trace(msg string) string {
    fmt.Println("evaluated:", msg)
    return msg
}
defer fmt.Println(trace("A"))
// сразу печатает: evaluated: A
// при выходе из функции печатает: A
```

**Кейс 2 — прямой аргумент "заморожен" в момент defer:**
```go
i := 0
defer fmt.Println("arg:", i)   // i=0 зафиксировано СЕЙЧАС
i = 100
// вывод: arg: 0
```

**Кейс 3 — замыкание читает значение позже, при фактическом вызове:**
```go
i := 0
defer func() { fmt.Println("closure:", i) }()   // читает i ПОЗЖЕ
i = 100
// вывод: closure: 100
```

**Кейс 4 — цикл с замыканием (Go 1.22+, у каждой итерации своя `i`):**
```go
for i := 0; i < 3; i++ {
    defer func() { fmt.Println(i) }()
}
// вывод: 2, 1, 0   (LIFO)
```

**Кейс 5 — тот же цикл с прямым аргументом (работает одинаково в любой версии Go):**
```go
for i := 0; i < 3; i++ {
    defer fmt.Println("direct:", i)   // значение фиксируется на каждой итерации
}
// вывод: direct: 2, direct: 1, direct: 0
```

---

### Q3. Is defer free? Any concerns in a tight loop? Является ли defer бесплатным? Есть ли проблемы при использовании в тесном цикле?

**Cost:** Each `defer` has runtime overhead (recording a defer entry; since Go 1.14 many defers are cheaper via open-coded / stack-based defers in common cases, but it is still not zero).

**When it matters:** Tight loops registering many defers (e.g. per iteration) can dominate — pattern is to hoist cleanup outside the loop, use explicit `Close()`, or restructure.

**For you:** “Always avoid defer” is wrong for normal code; “profile inner loops” is the balanced answer.

По-русски, кратко по пунктам:

- Каждый `defer` — небольшие накладные расходы на регистрацию отложенного вызова.
- С Go 1.14 (open-coded defer) многие случаи стали почти бесплатными.
- Но именно в цикле это ускорение не работает — компилятор не знает заранее число итераций, поэтому используется старый, более дорогой механизм даже на новых версиях Go.
- Более важная проблема, чем скорость: `defer` срабатывает один раз — при выходе из всей функции, а не на каждой итерации.
- Значит ресурсы (файлы, локи), открытые в цикле через `defer`, копятся и не освобождаются до конца функции — можно упереться в лимит ОС (например, число открытых файловых дескрипторов) раньше, чем вообще заметишь торможение.
- Решение — выносить тело цикла в отдельную функцию (тогда `defer` срабатывает на каждой итерации отдельно) либо вызывать `Close()` явно.
- Итог: «всегда избегайте defer» — неверный ответ; правильно — использовать `defer` в обычном коде и разбираться с производительностью в цикле только после профилирования.

---

## Concurrency and channels

> Allocate several minutes here for senior roles.

### Q1. Goroutine vs OS thread — what does the Go runtime schedule?

**Model:** A goroutine is a user-space task scheduled by the Go runtime onto a small pool of OS threads (`GOMAXPROCS` defaults to number of CPUs). M:N scheduling: many goroutines per thread — switching is cheaper than OS thread switching in many cases.

**Blocking:** If a goroutine blocks in the runtime (channel, mutex), the scheduler parks it and runs others on that thread. Long blocking syscalls may require extra OS threads so other goroutines keep progressing. (Длительные блокирующие системные вызовы могут потребовать дополнительных потоков операционной системы, чтобы другие горутины могли продолжать выполнение.)

**For you:** Candidate should not claim 1 goroutine == 1 OS thread. Mentioning work stealing, **network poller**, or `sysmon` is bonus material.

Модель точнее называется **G-M-P**, а не просто "M:N":
- **G** (goroutine) — сама задача.
- **M** (machine) — реальный OS-поток.
- **P** (processor) — "разрешение" исполнять код Go; их количество равно `GOMAXPROCS`.

Важный нюанс: **M** может быть **больше**, чем `GOMAXPROCS` — когда горутины блокируются в syscall, рантайм создаёт дополнительные потоки. А вот число **P** фиксировано (`GOMAXPROCS`) — именно оно ограничивает, сколько горутин выполняется параллельно в конкретный момент, а не число M.

**P vs Process — частая путаница на собеседовании** ("processor" звучит похоже на "process"):

| | Процесс (Process) | P (Processor в Go) |
|---|---|---|
| Кто создаёт | Операционная система | Существует только внутри Go runtime, ОС не создаёт |
| Что это | Запущенный экземпляр программы | Логический планировщик + очередь горутин (run queue) |
| Память | Имеет своё адресное пространство | Не хранит память как процесс |
| Уровень | Уровень ОС | Уровень Go runtime **внутри** одного процесса |

Коротко: GMP целиком работает **внутри одного OS-процесса** — P не создаёт новых процессов и не имеет к ним отношения, это просто внутренняя структура данных планировщика.

**Syscall vs сеть — разная цена блокировки:**
- Блокирующий **syscall** (например, чтение с диска) реально занимает OS-поток целиком, поэтому рантайм может добавить ещё один M, чтобы остальные горутины продолжали работать.
- Блокировка на **сети** (например, чтение из TCP-соединения) **не занимает поток вообще**: горутина паркуется, а сокет регистрируется в network poller (epoll/kqueue/IOCP), который разбудит горутину, когда данные придут. Поэтому тысячи горутин, ждущих сетевого ответа, почти ничего не стоят рантайму — в этом одно из главных преимуществ модели Go для сетевых сервисов.

**Work stealing:** когда у одного **P** закончились задачи в своей очереди, он "ворует" горутины из очереди другого **P**, чтобы не простаивать.

**sysmon** — служебная горутина рантайма Go (управляется отдельно от обычного планировщика), которая следит за состоянием программы: помогает планировщику прерывать (preemption) долго работающие горутины, будит таймеры, взаимодействует с network poller и помогает работе сборщика мусора.
```text

          Goroutines

               │

               ▼

      Scheduler (G-M-P)

               ▲

               │

            sysmon

               │

      ├─ следит за долгими G

      ├─ будит таймеры

      ├─ помогает network poller

      └─ помогает GC

```
---

### Q2. Buffered vs unbuffered channels: what happens on send and receive?

**Unbuffered** (`make(chan T)`): Send and receive rendezvous — the sender unblocks exactly when a receiver takes the value (and vice versa). Strong synchronization point.

**Buffered** (`make(chan T, n)`): Send blocks only when `n` elements are already queued; receive blocks when empty. A buffer smooths bursts but does not remove back-pressure — if producers outpace consumers, the buffer fills and sends block (or you must `select` with `default` and drop).

**Zero value:** A nil channel: send and receive block forever — sometimes used in `select` to disable a branch.

**For you:** Listen for synchronization semantics, back-pressure, and nil channel behavior.

| | Unbuffered `make(chan T)` | Buffered `make(chan T, n)` | Nil `var ch chan T` |
|---|---|---|---|
| Send блокируется, когда | Всегда — пока receiver не заберёт значение | Буфер заполнен (уже `n` элементов) | Всегда, навсегда |
| Receive блокируется, когда | Всегда — пока кто-то не пришлёт значение | Буфер пуст | Всегда, навсегда |
| Синхронизация | Rendezvous — send и receive встречаются в один момент | Есть back-pressure, но не строгая синхронизация — буфер сглаживает всплески | Не участвует — используется в `select`, чтобы отключить ветку |
| Что произойдёт, если producer быстрее consumer | Send блокируется сразу | Буфер заполняется, потом send блокируется (или `select` + `default`, чтобы дропать) | — |

---

### Q3. How do you use select for timeouts, cancellation, and fan-in?

**Semantics:** `select` blocks until at least one case can proceed — if multiple, one is chosen pseudo-randomly among ready cases (avoids starvation). No `default`: blocks. With `default`: non-blocking; if nothing ready, runs `default`.

**Patterns:** Combine `<-ctx.Done()` with work channels for cancellation; use `time.After` for simple timeouts or prefer `time.NewTimer` in loops (`time.After` in a loop leaks timers until GC — strong candidates know this).

**Fan-in:** multiple goroutines send to one channel, or one goroutine selects multiple inputs.

**For you:** Weak answers omit timer leaks or random tie-break behavior.
**Отмена операций (Cancellation)**. Для отмены работы горутин обычно используют context.Context. В select добавляют <-ctx.Done(), чтобы горутина могла завершиться при отмене контекста (например, из-за таймаута, отмены HTTP-запроса или остановки приложения).
```
select {
case job := <-jobs:
    process(job)
case <-ctx.Done():
    return ctx.Err()
}
```
Для простых разовых таймаутов можно использовать time.After:
```
select {
case result := <-resultCh:
    return result
case <-time.After(3 * time.Second):
    return errors.New("timeout")
}
```
Однако в циклах предпочтительнее использовать time.NewTimer, поскольку каждый вызов time.After создает новый таймер, который остается в памяти до срабатывания и последующей сборки мусора (GC). time.NewTimer позволяет переиспользовать один и тот же таймер и избежать лишних аллокаций.
**Fan-in**
Fan-in — это паттерн объединения нескольких потоков данных в один.
Вариант 1. Несколько горутин отправляют результаты в один общий канал — это самый распространенный способ (например, в Worker Pool).
```
go worker(1, results)
go worker(2, results)
go worker(3, results)
for i := 0; i < 3; i++ {
    result := <-results
    fmt.Println(result)
}
```
Вариант 2. Одна горутина использует select для одновременного чтения из нескольких независимых каналов, логически объединяя их в один поток обработки.
```
select {
case msg := <-channelA:
    handleA(msg)
case msg := <-channelB:
    handleB(msg)
case <-ctx.Done():
    return
}
```
Первый вариант используют, когда несколько производителей отправляют данные одному потребителю. Второй — когда необходимо одновременно обрабатывать события из нескольких независимых источников (каналы, таймеры, ctx.Done(), сетевые события и т.д.).

---

### Q4. What is context.Context for? When is context.Value appropriate vs discouraged?

**Purpose:** `context.Context` carries cancellation signals, deadlines (or timeouts), and optional *request-scoped values* across API boundaries (HTTP handlers → DB → downstream RPC).

**API:** `Done()` returns a channel closed when context is canceled; `Err()` returns why; `Deadline()` exposes deadline.

**Propagation:** Pass `ctx` as the first parameter; libraries should respect `ctx` for network I/O and long work.

**Values (`context.WithValue`):** Official docs warn against abusing `Value` for optional parameters — it obscures APIs and complicates testing. Acceptable for request ID, tracing, auth token when the whole stack agrees. Avoid stuffing large mutable state into `Value`.

**Cancellation:** Parents cancel children; no implicit parent wait — goroutines must cooperate (check `ctx` in loops).

**For you:** Strong answers discuss propagation, `context.WithTimeout` / `context.WithCancel`, and when not to use `context.Background()` as the root of request-scoped work.

**Как передать `ctx` на вход функции:** первым параметром, с именем `ctx`.
```go
func DoSomething(ctx context.Context, id string) error { ... }
```
Тип `context.Context` обязателен, имя `ctx` — соглашение (не проверяется компилятором, но проверяется линтерами), позиция первым параметром — тоже соглашение, которое ловят линтеры.

**Виды контекстов — как создать каждый:**

```go
ctx := context.Background()                                   // корневой, пустой

ctx := context.TODO()                                          // заглушка, пока не решили какой нужен

ctx, cancel := context.WithCancel(context.Background())        // отмена вручную через cancel()
defer cancel()

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)  // автоотмена через 5 секунд
defer cancel()

ctx, cancel := context.WithDeadline(context.Background(), someTime)      // автоотмена в момент someTime
defer cancel()

ctx := context.WithValue(context.Background(), key, "value")   // несёт значение, cancel не возвращает
```
Обратите внимание: `WithCancel`/`WithTimeout`/`WithDeadline` возвращают **два** значения (`ctx, cancel`) — `cancel` обязательно вызывать через `defer`, иначе ресурсы контекста не освободятся вовремя. `WithValue` возвращает только `ctx` — своей отмены у него нет, он просто передаёт отмену родителя дальше.

Тип переменной `ctx` всегда один и тот же — интерфейс `context.Context`. Определить, "какой это контекст", можно только по тому, **какой функцией он создан** в коде (в месте создания), либо интроспекцией через методы (`ctx.Err()`, `ctx.Deadline()`).

**Каждый `WithXxx` берёт `parent` первым аргументом — это не новый контекст, а обёртка над ним:**
```go
parent, cancelParent := context.WithCancel(context.Background())
child, cancelChild := context.WithTimeout(parent, 10*time.Second)  // parent передан как аргумент — child им обёрнут
defer cancelChild()

cancelParent()               // отменяем РОДИТЕЛЯ
<-child.Done()                // child тоже уже отменён! закрылся каскадно
fmt.Println(child.Err())      // context.Canceled — хотя таймаут 10 секунд ещё не прошёл
```
Отмена всегда идёт сверху вниз (родитель → потомки), а не наоборот: отмена `child` никак не повлияет на `parent`.

Три метода, которые есть у любого `ctx`, независимо от того, как он создан:
- `Done()` — канал, закрывается при отмене (используется в `select`).
- `Err()` — причина отмены: `context.Canceled` или `context.DeadlineExceeded`.
- `Deadline()` — возвращает установленный дедлайн, если он есть.

```go
select {                          // Done()
case <-ctx.Done():
    return ctx.Err()
case res := <-resultCh:
    return res
}

if ctx.Err() != nil {             // Err()
    log.Println("cancelled:", ctx.Err())
}

if d, ok := ctx.Deadline(); ok {  // Deadline()
    fmt.Println("time left:", time.Until(d))
}
```

| `context.Value` — когда уместно | Когда НЕ уместно (по докам Go) |
|---|---|
| Request ID, trace ID, auth-токен — сквозные метаданные, на которые согласен весь стек | Опциональные параметры функции — прячет реальную сигнатуру API |
| Данные не влияют на бизнес-логику, только на трассировку/логирование | Изменяемое состояние — контекст не для этого |
| Значение действительно request-scoped (живёт вместе с запросом) | Большие объекты, конфигурация, зависимости (передавайте явными параметрами) |

---

### Q5. sync.Mutex, RWMutex, Once, WaitGroup, errgroup — pick one and describe a real use case.

**`sync.Mutex`:** Exclusive lock — one goroutine at a time in the critical section. Simplest tool for shared mutable state.

**`sync.RWMutex`:** Many concurrent readers OR one writer. Use when reads dominate and writes are rare; has more overhead than `Mutex` for uncontended cases — not always faster.

**`sync.Once`:** Guarantees a function runs exactly once (e.g. lazy init of singleton). Safe for concurrent calls.

**`sync.WaitGroup`:** Wait for a fixed number of goroutines to finish (`Add`, `Done`, `Wait`). Easy to misuse counts.

**`golang.org/x/sync/errgroup`:** Runs a group of tasks with a derived context that cancels on first error — useful for parallel HTTP fetches or bounded worker pools with error propagation.

**For you:** Any one primitive explained with a concrete scenario (not just definitions) is enough; depth on *errgroup* vs raw `WaitGroup` indicates experience.
**WaitGroup** — это примитив синхронизации, который только ожидает завершения группы горутин. Если нужно обрабатывать ошибки или отменять остальные задачи при первой ошибке, придётся реализовывать это самостоятельно.
**errgroup** построен поверх WaitGroup и Context: он запускает группу задач, возвращает первую возникшую ошибку и автоматически отменяет остальные задачи через общий Context. Поэтому для параллельных HTTP/gRPC-запросов и большинства современных сервисов errgroup обычно предпочтительнее.

| Примитив | Для чего | Реальный сценарий |
|---|---|---|
| `sync.Mutex` | Эксклюзивная блокировка — только одна горутина в критической секции | Счётчик/кэш в памяти, который меняют несколько горутин |
| `sync.RWMutex` | Много читателей ИЛИ один писатель | Конфиг, который часто читают и редко обновляют |
| `sync.Once` | Гарантирует, что функция выполнится ровно один раз | Ленивая инициализация singleton (подключение к БД при первом запросе) |
| `sync.WaitGroup` | Дождаться завершения фиксированного числа горутин (`Add`/`Done`/`Wait`) | Запустить N воркеров и дождаться, пока все закончат |
| `errgroup.Group` | То же, что `WaitGroup`, + возврат первой ошибки + автоотмена остальных через `Context` | Параллельные HTTP-запросы к нескольким сервисам — если один упал, отменить остальные |

```go
var mu sync.Mutex          // Mutex
mu.Lock()
counter++
mu.Unlock()

var mu sync.RWMutex        // RWMutex
mu.RLock()
v := cache["key"]
mu.RUnlock()

var once sync.Once         // Once
once.Do(func() { db = connect() })

var wg sync.WaitGroup      // WaitGroup
for i := 0; i < 3; i++ {
    wg.Add(1)
    go func() { defer wg.Done(); work() }()
}
wg.Wait()

g, ctx := errgroup.WithContext(context.Background())  // errgroup
for _, url := range urls {
    url := url
    g.Go(func() error { return fetch(ctx, url) })
}
err := g.Wait()   // первая ошибка среди всех, если была
```

---

### Q6. Who should close a channel? What happens if you send on a closed channel or receive after close?

**Who closes:** Only the sender should close (or one dedicated owner goroutine). Closing signals no more values will be sent. Receivers keep reading until drained; then `ok` is `false`.

**Panics:** Send on a closed channel panics. Close on a closed channel panics. Receive on a closed channel returns the zero value and `ok == false` (unless channel still has buffered values).

**Why not receiver closes:** Avoids races with concurrent sends; the idiom “sender closes” matches pipeline flow.

**For you:** Candidate should know panic rules and send vs receive after close.

---

### Q7. Design a worker pool: how do you stop workers cleanly?

**Shutdown pattern:**

1. Signal no more work: `cancel()` on a `Context`, or close the jobs channel only from the producer if one sender owns it.
2. Workers `select` on `ctx.Done()` and/or the jobs channel — exit when canceled or channel closed.
3. Use `WaitGroup` (or `errgroup`) so the main goroutine waits until all workers exit.
4. Avoid leaked goroutines stuck on receive.

**Pitfalls:** Closing a jobs channel from multiple goroutines; workers sending on a result channel after shutdown without coordination; unbounded goroutines per task.

**For you:** Listen for `Context`, `WaitGroup`, single closer, and drain vs exit semantics.
**Worker Pool** — Graceful Shutdown

```text
                main
                 │
        ctx, cancel()
                 │
                 ▼
             Producer
                 │
                 ▼
               jobs
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
     Worker1  Worker2  WorkerN
        │        │        │
        └────────┼────────┘
                 ▼
              results
                 │
                 ▼
            Aggregator

Shutdown:
1. cancel() или close(jobs)
2. Workers завершаются
3. WaitGroup.Wait()
4. close(results)
```
**Правила**
- `jobs` закрывает **только Producer**.
- Workers завершаются при `ctx.Done()` или закрытии `jobs`.
- `WaitGroup` ждёт завершения всех workers.
- После `Wait()` закрывается `results`.

- **Drain vs Exit**

**Drain** — обработать все задачи и завершиться.
```text
Producer → close(jobs) → Workers дочитывают jobs → Exit
```
**Exit** — завершиться сразу после отмены.

```text
cancel() → ctx.Done() → Workers сразу Exit
```

**Типичные ошибки**
- ❌ Закрывать `jobs` из нескольких горутин.
- ❌ Закрывать `results`, пока workers ещё пишут.
- ❌ Создавать горутину на каждую задачу.
- ❌ Оставлять горутины навсегда заблокированными на чтении.

**Короткий ответ для интервью:** останавливаем через `context` (`cancel()`) или закрытие `jobs` только продюсером — никогда с нескольких горутин. Каждый worker в `select` слушает и `ctx.Done()`, и `jobs`, выходит по любому из них. `WaitGroup` в главной горутине ждёт, пока все workers реально завершатся, и только после этого закрываем `results` — иначе можно закрыть канал, пока в него ещё кто-то пишет.

---

### Q8. How would you explain happens-before to a junior in the context of a mutex?

**Memory model (short):** The Go spec defines a happens-before relation. For a mutex: unlock of mutex `M` happens-before any later lock of `M`. Therefore writes done before unlock are visible to the goroutine that next locks `M`.

**Without sync:** The compiler and CPU may reorder loads/stores; other goroutines can observe stale or *reordered* partial updates unless you use mutex, channel ops with ordering, atomic, etc.

**For you:** Junior-friendly explanation is enough; senior might mention atomic vs mutex for single-word fields.
Happens-before — это гарантия порядка видимости изменений между горутинами.
Для Mutex правило такое:
Unlock() происходит раньше (happens-before), чем следующий Lock() того же Mutex.
Это означает, что все изменения, сделанные до Unlock(), гарантированно увидит горутина, которая затем выполнит Lock().
Без синхронизации (Mutex, каналов, atomic) компилятор и процессор могут менять порядок операций, поэтому другие горутины могут увидеть устаревшие или неконсистентные данные.

**Аналогия для junior — тетрадь и ключ от комнаты:** общая тетрадь лежит в комнате, а ключ от неё один на всех. Чтобы что-то дописать или прочитать в тетради, нужно сначала взять ключ (`Lock`), а закончив — положить его обратно (`Unlock`). Happens-before говорит: если ты дописал что-то в тетради и положил ключ обратно, то следующий, кто возьмёт этот же ключ, гарантированно увидит именно твою запись, а не старую версию. Без этого правила два человека могли бы писать в тетрадь одновременно, каждый видя свою устаревшую копию.

**Аналогия для junior — эстафетная палочка:** мьютекс — это как эстафетная палочка. Пока она у тебя — работаешь только ты. Передал (`Unlock`) — следующий берёт (`Lock`) и стартует только после этого, а значит гарантированно продолжает с того места, где ты закончил, а не с какого-то старого состояния. Второй бегун никогда не стартует раньше, чем палочка физически передана — в этом и есть суть happens-before: гарантия порядка, а не просто "по очереди пользуемся общим ресурсом".

---

### Q9. When is a channel the wrong tool?

**Rob Pike quote context:** “Don’t communicate by sharing memory; share memory by communicating” — channels are great when goroutines own work and pass it explicitly. But protecting a small shared struct with a mutex is idiomatic and often clearer than a channel for every field.

**Bad channel use:** Using a channel as a mutex substitute (send token to serialize) can work but is often harder to read than `sync.Mutex`. High contention on one channel, or many-to-many patterns without discipline, gets messy.

**For you:** Good answers acknowledge both mutexes and channels; dogmatic “only channels” is a red flag.
Channels и Mutex решают разные задачи. Я использую channel, когда нужно организовать обмен данными или построить pipeline между горутинами. Если же нужно просто защитить общий ресурс, например структуру или map, то sync.Mutex обычно проще, понятнее и эффективнее. Использовать channel как замену Mutex можно, но часто это только усложняет код. Главное — выбирать инструмент под задачу, а не придерживаться принципа “только channels” или “только mutex”.

| Ситуация | Что использовать | Почему |
|---|---|---|
| Защитить общий счётчик/структуру/map от нескольких горутин | `sync.Mutex` | Проще, понятнее, дешевле — не нужно гонять данные через канал ради простого чтения/записи |
| Передать владение данными между этапами (producer → worker → aggregator) | `channel` | Канал естественно моделирует поток данных и передачу владения — "не разделяй память, общайся" |
| Сигнал "готово"/"отмена", без полезной нагрузки | `channel` (`close`) или `context.Done()` | Это событие, а не данные для защиты — mutex тут не подходит вообще |
| Один инкремент простого счётчика (`int64`) | `atomic` (не mutex и не channel) | Оба — оверкилл для одной атомарной операции |

---

## Mini scenario (optional live coding topic)

### Q10. Ask the candidate to sketch (on paper) a pipeline: producer → N workers → aggregator with cancellation on Context.

**Pass / fail without reading Go:** Does the sketch show three stages (input → parallel workers → merge) with *clear data flow*? Is the number of workers bounded (not one goroutine per item forever)? Is there a stop story (cancel, close, or signal) so goroutines don’t run forever?

**Go-specific pluses:** Context cancellation; `WaitGroup`; directional channel types (`chan<-` / `<-chan`); buffered job queue size; error return path from workers to main.

**Red flags:** Unbounded goroutines; no shutdown; closing channels from multiple goroutines; deadlock on full buffer with no consumer.

**For you:** You can score structure and safety even if you cannot validate syntax.

**Pipeline: Producer → N Workers → Aggregator**

```text
                 Context
                    │
                    ▼
                 Producer
                    │
                    ▼
                  jobs
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    Worker 1    Worker 2    Worker 3
        │           │           │
        └───────────┼───────────┘
                    ▼
                  results
                    │
                    ▼
               Aggregator
```
``` go
package main

import (
	"context"
	"fmt"
	"sync"
)

func producer(ctx context.Context, jobs chan<- int) {
	defer close(jobs)

	for i := 0; i < 10; i++ {
		select {
		case <-ctx.Done():
			return
		case jobs <- i:
		}
	}
}

func worker(
	ctx context.Context,
	jobs <-chan int,
	results chan<- int,
	wg *sync.WaitGroup,
) {
	defer wg.Done()

	for {
		select {
		case <-ctx.Done():
			return

		case job, ok := <-jobs:
			if !ok {
				return
			}

			results <- job * job
		}
	}
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	jobs := make(chan int)
	results := make(chan int)

	var wg sync.WaitGroup

	// Producer
	go producer(ctx, jobs)

	// Fan-out: фиксированный пул из трёх воркеров
	for w := 0; w < 3; w++ {
		wg.Add(1)
		go worker(ctx, jobs, results, &wg)
	}

	// Закрываем results только после завершения всех воркеров
	go func() {
		wg.Wait()
		close(results)
	}()

	// Aggregator / fan-in
	for result := range results {
		fmt.Println(result)
	}
}
```