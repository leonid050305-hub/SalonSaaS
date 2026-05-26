import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '../db'

export async function authRoutes(app: FastifyInstance) {

  // POST /api/auth/register
  app.post('/register', async (request, reply) => {
    const { name, email, password } = request.body as any

    if (!name || !email || !password) {
      return reply.code(400).send({ error: 'Заполните все поля' })
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return reply.code(409).send({ error: 'Email уже зарегистрирован' })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Создаём tenant + user в одной транзакции
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name,
          plan: 'FREE',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 дней
        },
      })
      const user = await tx.user.create({
        data: { tenantId: tenant.id, email, passwordHash, name },
      })
      return { tenant, user }
    })

    const token = app.jwt.sign({
      userId: result.user.id,
      tenantId: result.tenant.id,
      role: result.user.role,
    })

    reply.setCookie('token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 })
    return { user: { id: result.user.id, name, email, role: result.user.role } }
  })

  // POST /api/auth/login
  app.post('/login', async (request, reply) => {
    const { email, password } = request.body as any

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.code(401).send({ error: 'Неверный email или пароль' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return reply.code(401).send({ error: 'Неверный email или пароль' })
    }

    const token = app.jwt.sign({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    })

    reply.setCookie('token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 })
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role } }
  })

  // POST /api/auth/logout
  app.post('/logout', async (request, reply) => {
    reply.clearCookie('token')
    return { ok: true }
  })

  // GET /api/auth/me
  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const payload = request.user as any
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, role: true, tenantId: true },
    })
    return user
  })
}
