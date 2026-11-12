## Содержание

1. [Что такое провайдер, ресурс, дата-сорс в Terraform?](#1-что-такое-провайдер-ресурс-дата-сорс-в-terraform)
2. [Что такое state файл, зачем он нужен и где его лучше хранить?](#2-что-такое-state-файл-зачем-он-нужен-и-где-его-лучше-хранить)
3. [Что такое backend и какие виды backend вы знаете?](#3-что-такое-backend-и-какие-виды-backend-вы-знаете)
4. [Что будет, если потерять state?](#4-что-будет-если-потерять-state)
5. [Как решать конфликты при работе нескольких разработчиков с одним state?](#5-как-решать-конфликты-при-работе-нескольких-разработчиков-с-одним-state)
6. [Что такое locking?](#6-что-такое-locking)
7. [Что такое module и для чего его использовать?](#7-что-такое-module-и-для-чего-его-использовать)
8. [Разница между variable, local, output?](#8-разница-между-variable-local-output)
9. [terraform plan, terraform apply, terraform destroy](#9-terraform-plan-terraform-apply-terraform-destroy)
10. [Как работает lifecycle (ignore_changes, prevent_destroy, create_before_destroy)?](#10-как-работает-lifecycle-ignore_changes-prevent_destroy-create_before_destroy)
11. [Как хранить секреты (пароли, ключи) в Terraform?](#11-как-хранить-секреты-пароли-ключи-в-terraform)
12. [Когда использовать terraform import?](#12-когда-использовать-terraform-import)
13. [Как работают provider alias и зачем они нужны?](#13-как-работают-provider-alias-и-зачем-они-нужны)

---

## Вопросы и ответы

### 1. Что такое провайдер, ресурс, дата-сорс в Terraform?

**Provider** — плагин, через который Terraform взаимодействует с API внешней системы (AWS, DigitalOcean, Kubernetes и т.д.). Сам Terraform не знает, как создать Droplet или EC2 — эту логику реализует provider. Указывается в `required_providers`:

```hcl
terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}
```

При `terraform init` provider скачивается, обычно из Terraform Registry. Схема работы: `Terraform → Provider → API → Infrastructure`.

**Resource** — объект инфраструктуры, которым Terraform управляет: создаёт, читает текущее состояние, изменяет и удаляет (CRUD).

```hcl
resource "digitalocean_droplet" "app" {
  name   = "app-server"
  region = "fra1"
  size   = "s-1vcpu-1gb"
  image  = "ubuntu-24-04-x64"
}
```

Здесь `digitalocean_droplet` — тип ресурса, `app` — его имя внутри Terraform, полный адрес — `digitalocean_droplet.app`. При `terraform apply` Terraform через provider вызывает API платформы и создаёт или изменяет Droplet.

**Data Source** — используется, чтобы получить информацию об уже существующем объекте, а не создавать его:

```hcl
data "digitalocean_vpc" "main" {
  name = "production-vpc"
}
```

Дальше можно использовать `data.digitalocean_vpc.main.id`, например при создании другого ресурса. Terraform не управляет жизненным циклом этого объекта — он только читает информацию о нём через provider.

**Главное отличие:**
- **Provider** — плагин для взаимодействия Terraform с API платформы.
- **Resource** — объект, которым Terraform управляет: Create / Read / Update / Delete.
- **Data Source** — существующий объект, данные о котором Terraform только читает (Read).

---

### 2. Что такое state файл, зачем он нужен и где его лучше хранить?

**State** — файл, в котором Terraform хранит информацию о ресурсах, которыми управляет, и связывает `.tf`-конфигурацию с реальной инфраструктурой. По умолчанию это `terraform.tfstate`.

Например, для ресурса из конфигурации:
```hcl
resource "digitalocean_droplet" "app" {
  name = "app-server"
}
```
после `terraform apply` state хранит соответствие: `digitalocean_droplet.app → Droplet ID = 12345678`.

**Зачем нужен:** state позволяет Terraform понимать, какие ресурсы уже созданы, какой реальный объект соответствует `resource` в `.tf`-файлах, какие у него текущие атрибуты, что изменилось между желаемым и текущим состоянием, и что нужно создать, изменить или удалить.

Упрощённая схема: `.tf файлы (что мы хотим) → State (чем Terraform управляет) → Cloud/API (что реально существует)`.

Например, если изменить размер Droplet, Terraform смотрит в state, находит ID существующего Droplet и понимает, что нужно изменить именно его, а не создавать новый.

**Где хранить:** для локальной разработки можно использовать локальный `terraform.tfstate`. Но в команде это неудобно — у каждого разработчика будет своя копия. Поэтому в production обычно используют **remote state** — централизованное хранилище: AWS S3, Azure Blob Storage, Google Cloud Storage, HCP Terraform / Terraform Cloud. И разработчики, и CI/CD работают с одним актуальным state.

**Требования к remote state:** централизованное хранение, защита от несанкционированного доступа, шифрование, backup/versioning, locking при необходимости. **State не стоит хранить в Git** — он может содержать чувствительную информацию.

---

### 3. Что такое backend и какие виды backend вы знаете?

**Backend** — механизм, который определяет, где Terraform хранит State и как получает к нему доступ. Важно не путать: **Provider** взаимодействует с инфраструктурой и её API, а **Backend** хранит и предоставляет доступ к Terraform State — это разные слои.

**Local Backend** — используется по умолчанию, State хранится локально в `terraform.tfstate`. Подходит для обучения и небольших локальных проектов.

**Remote Backend** — State хранится централизованно и удалённо. Примеры: AWS S3, Azure Blob Storage, Google Cloud Storage, HCP Terraform / Terraform Cloud.

```hcl
terraform {
  backend "s3" {
    bucket = "terraform-state"
    key    = "prod/terraform.tfstate"
    region = "eu-central-1"
  }
}
```

Remote backend удобен для команды и CI/CD — все работают с одним State. Многие remote backend также поддерживают **locking**, который не позволяет нескольким `terraform apply` одновременно изменять один State.

---

### 4. Что будет, если потерять state?

Если потерять `terraform.tfstate`, сама инфраструктура не исчезнет — ресурсы в AWS, DigitalOcean и т.д. продолжат существовать. Но Terraform потеряет информацию о соответствии `Terraform Resource → Реальный ресурс`, например `digitalocean_droplet.app → Droplet ID: 12345678`. Без State Terraform больше не знает, что этот Droplet уже существует и соответствует `digitalocean_droplet.app`.

**Что может произойти:** при `terraform plan/apply` Terraform может посчитать ресурс отсутствующим и попытаться создать его заново. Это может привести к дублированию ресурсов, ошибкам при создании, необходимости заново импортировать ресурсы.

**Как восстановить:** лучший вариант — восстановить State из backup/versioning. Если backup отсутствует, существующие ресурсы можно заново импортировать:

```bash
terraform import digitalocean_droplet.app 12345678
```

После этого Terraform снова связывает ресурс в конфигурации с реальным объектом.

---

### 5. Как решать конфликты при работе нескольких разработчиков с одним state?

При работе нескольких разработчиков используют **remote backend + state locking**. Все работают с одним централизованным State (`Developer A / Developer B / CI/CD → Remote State`). Когда один разработчик выполняет `terraform apply`, Terraform устанавливает **lock** на State — второй разработчик в этот момент ждёт или получает ошибку. После завершения операции lock снимается.

**Важно:** locking защищает State от одновременной записи, но не решает конфликты самих изменений. Поэтому дополнительно используют: Git + code review, один общий remote State, locking, отдельные State для разных окружений (`dev`, `stage`, `prod`), и не запускают несколько независимых `apply` для одного State одновременно.

---

### 6. Что такое locking?

**State locking** — механизм, который временно блокирует Terraform State, пока один Terraform-процесс его изменяет (механику lock/unlock см. в Q5). Главная цель — не допустить одновременной записи в один State.

**Зачем нужен:** без locking два Terraform-процесса могут одновременно изменить State, что может привести к race condition, повреждению или рассинхронизации State, некорректному состоянию Terraform.

**Где используется:** обычно вместе с **remote backend**, если конкретный backend его поддерживает.

**Важно:** locking защищает **State**, а не саму инфраструктуру — он не запрещает вручную изменить сервер напрямую в AWS или DigitalOcean, а предотвращает только одновременное выполнение Terraform-операций над одним State.

---

### 7. Что такое module и для чего его использовать?

**Module** — набор Terraform-файлов, объединённых для повторного использования и организации инфраструктуры. Может содержать `resources`, `variables`, `locals`, `outputs` и другие modules.

**Зачем использовать:**
- **Reuse** — не дублировать одинаковую конфигурацию.
- **Абстракция** — скрыть сложную инфраструктуру за простым интерфейсом.
- **Стандартизация** — создавать инфраструктуру одинаковым способом.
- **Удобство поддержки** — изменить логику в одном месте.

**Где обычно используют:** типовой веб-сервер/VM (одинаковая настройка для dev/stage/prod), VPC/сеть с одинаковой структурой в разных регионах, база данных со стандартной конфигурацией (backup, размер, теги) для каждого нового сервиса.

**Пример:** структура module:
```text
modules/web-server/
├── main.tf
├── variables.tf
└── outputs.tf
```
Внутри может быть сложная логика:
```hcl
resource "digitalocean_droplet" "web" {
  name   = var.name
  region = "fra1"
  size   = "s-1vcpu-1gb"
}
```
В основном проекте module используется через `source`, и его можно вызывать несколько раз с разными параметрами:
```hcl
module "web_prod" {
  source = "./modules/web-server"
  name   = "production"
}

module "web_stage" {
  source = "./modules/web-server"
  name   = "staging"
}
```
То есть инфраструктура описывается один раз, а переиспользуется с разными параметрами (например, для разных окружений).

---

### 8. Разница между variable, local, output?

**Variable** — входной параметр модуля, значение передаётся извне:
```hcl
variable "environment" {
  type = string
}
# использование: name = var.environment
```

**Local** — внутреннее значение модуля, вычисляется внутри и используется в нескольких местах, чтобы не повторять одинаковые значения/сложные выражения:
```hcl
locals {
  app_name = "my-app-${var.environment}"
}
# использование: name = "${local.app_name}-server"
```

**Типичный пример использования** — общий набор тегов, которые нужно навесить на несколько ресурсов одинаково:
```hcl
locals {
  common_tags = {
    project     = "user-service"
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "digitalocean_droplet" "app" {
  name = "app-server"
  tags = local.common_tags
}

resource "digitalocean_droplet" "worker" {
  name = "worker-server"
  tags = local.common_tags
}
```
Без `local` пришлось бы дублировать один и тот же блок тегов в каждом ресурсе — если понадобится добавить новый тег, изменения пришлось бы вносить в каждом месте отдельно. С `local` — меняем в одном месте, и все ресурсы, которые его используют, получают изменение автоматически.

**Output** — значение, которое модуль возвращает наружу, например для использования в другом модуле:
```hcl
output "server_ip" {
  value = digitalocean_droplet.app.ipv4_address
}
```

Коротко: `variable` — вход в модуль, `local` — внутреннее значение, `output` — выход из модуля.

---

### 9. terraform plan, terraform apply, terraform destroy

**`terraform plan`** — показывает, какие изменения Terraform собирается выполнить, но ничего не изменяет. Terraform сравнивает конфигурацию, State и реальное состояние инфраструктуры:
```bash
terraform plan
```
В результате видно `+ create`, `~ update`, `- destroy` и итоговую сводку, например `Plan: 2 to add, 1 to change, 0 to destroy.`

**`terraform apply`** — применяет изменения к реальной инфраструктуре: строит plan → показывает изменения → после подтверждения выполняет их через provider → обновляет State.
```bash
terraform apply
```
Можно заранее сохранить план и применить именно его (частый паттерн в CI/CD):
```bash
terraform plan -out=tfplan
terraform apply tfplan
```

**`terraform destroy`** — удаляет ресурсы, которыми Terraform управляет в рамках текущего State (не всю инфраструктуру в аккаунте, только то, что под управлением этого State):
```bash
terraform destroy
```

Коротко: `plan` — посмотреть, что изменится; `apply` — применить изменения; `destroy` — удалить управляемые ресурсы.

---

### 10. Как работает lifecycle (ignore_changes, prevent_destroy, create_before_destroy)?

**`lifecycle`** — блок внутри `resource`, который управляет поведением Terraform при изменении, замене или удалении ресурса.

**`ignore_changes`** — говорит Terraform игнорировать изменения указанных атрибутов после создания ресурса:
```hcl
lifecycle {
  ignore_changes = [tags]
}
```
Например, если `tags` изменяет внешняя система, Terraform не будет пытаться вернуть их обратно при следующем `apply`.

**`prevent_destroy`** — запрещает Terraform удалить ресурс:
```hcl
lifecycle {
  prevent_destroy = true
}
```
Полезно для критичных ресурсов, например production database — при попытке удаления Terraform выдаст ошибку.

**`create_before_destroy`** — при необходимости заменить ресурс Terraform сначала создаёт новый и только потом удаляет старый:
```hcl
lifecycle {
  create_before_destroy = true
}
```
Помогает уменьшить downtime: `OLD → create NEW → destroy OLD`.

Коротко: `ignore_changes` — игнорировать изменения атрибутов, `prevent_destroy` — запретить удаление ресурса, `create_before_destroy` — сначала создать новый, потом удалить старый.

---

### 11. Как хранить секреты (пароли, ключи) в Terraform?

Секреты — пароли, API keys, tokens — нельзя хардкодить в `.tf`-файлах или хранить в Git.

**Environment Variables:** секрет передаётся через переменную окружения:
```bash
export TF_VAR_db_password="secret"
```
```hcl
variable "db_password" {
  type      = string
  sensitive = true
}
```
Terraform автоматически получит значение в `var.db_password`.

**Secret Manager:** для production лучше использовать внешнее хранилище секретов — AWS Secrets Manager, HashiCorp Vault, Azure Key Vault, Google Secret Manager. Схема: `Secret Manager → Terraform → Resource`. Получение — через обычный `data source`, provider делает реальный API-вызов при `plan`/`apply`:
```hcl
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/db/password"
}
# использование: password = data.aws_secretsmanager_secret_version.db_password.secret_string
```
Нужны IAM-права (`secretsmanager:GetSecretValue`) на секрет, и значение всё равно попадёт в State — так же, как через `sensitive = true`.

**`sensitive = true`:** секретные variables и outputs можно помечать этим флагом — это скрывает значение из обычного CLI output. **Важно:** `sensitive = true` не гарантирует, что секрет не попадёт в Terraform State — поэтому State тоже необходимо защищать: remote backend, шифрование и ограничение доступа.

---

### 12. Когда использовать terraform import?

**`terraform import`** используется, когда ресурс уже существует, но Terraform ещё не управляет им. Например, Droplet был создан вручную в DigitalOcean, и мы хотим передать его под управление Terraform.

Сначала описываем ресурс:
```hcl
resource "digitalocean_droplet" "app" {
  name = "app-server"
}
```
Затем импортируем существующий Droplet:
```bash
terraform import digitalocean_droplet.app 12345678
```
Terraform добавляет связь в State: `digitalocean_droplet.app → Droplet ID 12345678`.

**Когда использовать:** ресурс был создан вручную; ресурс создавался другим инструментом; нужно перевести существующую инфраструктуру под Terraform; нужно восстановить связь после потери State.

После импорта важно выполнить `terraform plan` и проверить, соответствует ли Terraform-конфигурация реальному ресурсу.

---

### 13. Как работают provider alias и зачем они нужны?

**Provider Alias** нужен, когда в одной Terraform-конфигурации необходимо использовать несколько конфигураций одного provider. Например, один проект работает с двумя AWS-аккаунтами: `app` — аккаунт с приложением, `shared` — аккаунт с общей инфраструктурой (Route53):

```hcl
provider "aws" {
  alias   = "app"
  profile = "app-account"
}

provider "aws" {
  alias   = "shared"
  profile = "shared-account"
}
```

Для каждого ресурса указываем нужный provider:
```hcl
resource "aws_instance" "app" {
  provider = aws.app
}

resource "aws_route53_record" "dns" {
  provider = aws.shared
}
```

При одном `terraform apply` Terraform понимает: `EC2 → aws.app → Application AWS Account`, `DNS → aws.shared → Shared AWS Account`.

Alias также используют для разных **регионов, credentials или Kubernetes-кластеров**.
