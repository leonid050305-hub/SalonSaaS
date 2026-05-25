# Деплой SalonOS

## Схема
```
Vercel  →  apps/web  (Next.js фронтенд)
Railway →  apps/api  (Fastify API)
Railway →  PostgreSQL (база данных)
```

---

## Шаг 1 — Загрузи код на GitHub

```bash
# В папке salon-app
git init
git add .
git commit -m "initial commit"

# Создай репозиторий на github.com и запушь
git remote add origin https://github.com/ТВО_ИМЯ/salon-app.git
git push -u origin main
```

---

## Шаг 2 — Railway (API + База данных)

### 2.1 Создай аккаунт
Зайди на **railway.app** → войди через GitHub

### 2.2 Создай проект
- Нажми **"New Project"**
- Выбери **"Deploy from GitHub repo"**
- Выбери репозиторий `salon-app`
- Укажи папку: `apps/api`

### 2.3 Добавь PostgreSQL
- В проекте нажми **"+ New"** → **"Database"** → **"PostgreSQL"**
- Railway автоматически создаст переменную `DATABASE_URL`

### 2.4 Настрой переменные окружения
В Railway → твой сервис → вкладка **"Variables"** добавь:

```
NODE_ENV=production
JWT_SECRET=сгенерируй_длинную_случайную_строку_32+символа
FRONTEND_URL=https://твой-домен.vercel.app
GREEN_API_ID=1105630966
GREEN_API_TOKEN=4fb748c451bb4c0f99cd34505db7d22fc651e4ec329a401298
```

> JWT_SECRET можно сгенерировать: `openssl rand -hex 32`

### 2.5 Применить миграции БД
После первого деплоя в Railway → твой сервис → **"Shell"**:
```bash
cd packages/db && npx prisma migrate deploy
```

### 2.6 Скопируй URL API
В Railway → твой сервис → вкладка **"Settings"** → **"Domains"**
Скопируй URL вида: `https://salon-app-api-production.up.railway.app`

---

## Шаг 3 — Vercel (Фронтенд)

### 3.1 Создай аккаунт
Зайди на **vercel.com** → войди через GitHub

### 3.2 Создай проект
- Нажми **"New Project"**
- Импортируй репозиторий `salon-app`
- **Root Directory**: `apps/web`
- Framework: **Next.js** (определится автоматически)

### 3.3 Настрой переменные окружения
В Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://твой-api.up.railway.app
```

### 3.4 Деплой
Нажми **"Deploy"** — через 2 минуты сайт готов.

---

## Шаг 4 — Проверь

После деплоя открой:
- `https://твой-домен.vercel.app/login` — страница входа
- `https://твой-домен.vercel.app/book/ID_САЛОНА` — виджет записи
- `https://твой-api.up.railway.app/health` — должен вернуть `{"status":"ok"}`

---

## Обновление кода

После изменений просто:
```bash
git add .
git commit -m "описание изменений"
git push
```
Railway и Vercel задеплоят автоматически.

---

## Домен (опционально)

Купи домен (например на reg.ru) и подключи:
- В Vercel: Settings → Domains → добавь домен
- В Railway: Settings → Domains → добавь домен для API

---

## Цены

| Сервис  | Тариф       | Цена         |
|---------|-------------|--------------|
| Railway | Starter     | $5/месяц     |
| Vercel  | Hobby       | Бесплатно    |
| Green API | Developer | Бесплатно    |

Итого: **$5/месяц** против 30 000 ₽/месяц YClients 🎉
