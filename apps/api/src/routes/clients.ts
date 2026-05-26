import { FastifyInstance } from 'fastify'
import { prisma } from '../db'

export async function clientRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/', auth, async (request) => {
    const { salonId } = request.params as any
    const { search, page = '1', limit = '20' } = request.query as any
    const where: any = { salonId }
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ]
    const [clients, total] = await Promise.all([
      prisma.client.findMany({ where, orderBy: { lastVisitAt: 'desc' }, skip: (Number(page)-1)*Number(limit), take: Number(limit) }),
      prisma.client.count({ where }),
    ])
    return { clients, total }
  })

  app.post('/', auth, async (request, reply) => {
    const { salonId } = request.params as any
    const { name, phone, email, notes } = request.body as any
    const client = await prisma.client.create({ data: { salonId, name, phone, email, notes } })
    return reply.code(201).send(client)
  })

  app.get('/:clientId/history', auth, async (request) => {
    const { clientId } = request.params as any
    return prisma.appointment.findMany({
      where: { clientId, status: 'COMPLETED' },
      include: { items: { include: { service: true } }, staff: { select: { name: true } } },
      orderBy: { startsAt: 'desc' },
      take: 20,
    })
  })
}
