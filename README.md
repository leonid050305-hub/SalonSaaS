# Salon App — альтернатива YClients

## Стек
- **Backend**: Node.js + TypeScript + Fastify
- **База данных**: PostgreSQL + Prisma ORM
- **Frontend**: Next.js 14 + Tailwind CSS

## Структура проекта

```
salon-app/
├── apps/
│   ├── api/          # Fastify REST API (порт 3000)
│   └── web/          # Next.js фронтенд (порт 3001)
└── packages/
    └── db/           # Prisma schema + клиент
```

## Быстрый старт

### 1. Установи зависимости
```bash
npm install
```

### 2. Настрой базу данных
```bash
# Создай .env файл
cp apps/api/.env.example apps/api/.env

# Запусти PostgreSQL (через Docker)
docker run -d \
  --name salon-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_USER=user \
  -e POSTGRES_DB=salon_db \
  -p 5432:5432 \
  postgres:16

# Примени схему
npm run db:push
```

### 3. Запусти
```bash
# API
cd apps/api && npm run dev

# Frontend (в другом терминале)
cd apps/web && npm run dev
```

## API Эндпоинты

### Авторизация
| Метод | URL | Описание |
|-------|-----|----------|
| POST | /api/auth/register | Регистрация |
| POST | /api/auth/login | Вход |
| POST | /api/auth/logout | Выход |
| GET  | /api/auth/me | Текущий пользователь |

### Салоны
| Метод | URL | Описание |
|-------|-----|----------|
| GET  | /api/salons | Список салонов |
| POST | /api/salons | Создать салон |
| PATCH | /api/salons/:id | Обновить салон |

### Мастера
| Метод | URL | Описание |
|-------|-----|----------|
| GET  | /api/salons/:salonId/staff | Список мастеров |
| POST | /api/salons/:salonId/staff | Добавить мастера |
| PATCH | /api/salons/:salonId/staff/:staffId | Обновить мастера |

### Услуги
| Метод | URL | Описание |
|-------|-----|----------|
| GET  | /api/salons/:salonId/services | Список услуг |
| POST | /api/salons/:salonId/services | Добавить услугу |
| PATCH | /api/salons/:salonId/services/:serviceId | Обновить услугу |
| DELETE | /api/salons/:salonId/services/:serviceId | Удалить услугу |

### Клиенты
| Метод | URL | Описание |
|-------|-----|----------|
| GET  | /api/salons/:salonId/clients?search=... | Список клиентов |
| POST | /api/salons/:salonId/clients | Добавить клиента |
| GET  | /api/salons/:salonId/clients/:clientId/history | История визитов |

### Записи
| Метод | URL | Описание |
|-------|-----|----------|
| GET  | /api/salons/:salonId/appointments?date=2024-03-15 | Список записей |
| POST | /api/salons/:salonId/appointments | Создать запись |
| PATCH | /api/salons/:salonId/appointments/:id/status | Изменить статус |
| DELETE | /api/salons/:salonId/appointments/:id | Отменить запись |

## Следующие шаги
- [ ] Frontend: страница входа
- [ ] Frontend: дашборд с календарём
- [ ] Frontend: управление мастерами и услугами
- [ ] Уведомления: WhatsApp Business API
- [ ] Виджет онлайн-записи для сайта клиента
