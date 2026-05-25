import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'

import { authRoutes } from './routes/auth'
import { salonRoutes } from './routes/salons'
import { staffRoutes } from './routes/staff'
import { serviceRoutes } from './routes/services'
import { clientRoutes } from './routes/clients'
import { appointmentRoutes } from './routes/appointments'
import { publicRoutes } from './routes/public'
import { startReminderCron } from './utils/cron'

const app = Fastify({ logger: true })

// ─── Плагины ─────────────────────────────────────────────────────────────────

await app.register(cors, {
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
  credentials: true,
})

await app.register(cookie)

await app.register(jwt, {
  secret: process.env.JWT_SECRET ?? 'change-me-in-production',
  cookie: { cookieName: 'token', signed: false },
})

// ─── Хелпер авторизации ──────────────────────────────────────────────────────

app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Unauthorized' })
  }
})

// ─── Роуты ───────────────────────────────────────────────────────────────────

await app.register(authRoutes,        { prefix: '/api/auth' })
await app.register(salonRoutes,       { prefix: '/api/salons' })
await app.register(staffRoutes,       { prefix: '/api/salons/:salonId/staff' })
await app.register(serviceRoutes,     { prefix: '/api/salons/:salonId/services' })
await app.register(clientRoutes,      { prefix: '/api/salons/:salonId/clients' })
await app.register(appointmentRoutes, { prefix: '/api/salons/:salonId/appointments' })
await app.register(publicRoutes,      { prefix: '/public' })

// ─── Healthcheck ─────────────────────────────────────────────────────────────

app.get('/health', () => ({ status: 'ok', ts: new Date().toISOString() }))

// ─── Запуск ──────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3000)

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`API running on http://localhost:${PORT}`)
  startReminderCron()
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
