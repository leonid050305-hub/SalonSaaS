import { FastifyInstance } from 'fastify'
import { prisma } from '../db'

export async function salonRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // GET /api/salons — все салоны тенанта
  app.get('/', auth, async (request) => {
    const { tenantId } = request.user as any
    return prisma.salon.findMany({ where: { tenantId } })
  })

  // POST /api/salons
  app.post('/', auth, async (request, reply) => {
    const { tenantId } = request.user as any
    const { name, address, phone, timezone } = request.body as any
    const salon = await prisma.salon.create({
      data: { tenantId, name, address, phone, timezone },
    })
    return reply.code(201).send(salon)
  })

  // PATCH /api/salons/:id
  app.patch('/:id', auth, async (request) => {
    const { id } = request.params as any
    const data = request.body as any
    return prisma.salon.update({ where: { id }, data })
  })
}
