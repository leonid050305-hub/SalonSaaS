import { FastifyInstance } from 'fastify'
import { prisma } from '../db'

export async function serviceRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/', auth, async (request) => {
    const { salonId } = request.params as any
    return prisma.service.findMany({ where: { salonId, isActive: true }, orderBy: { category: 'asc' } })
  })

  app.post('/', auth, async (request, reply) => {
    const { salonId } = request.params as any
    const { name, durationMin, price, category } = request.body as any
    const service = await prisma.service.create({ data: { salonId, name, durationMin, price, category } })
    return reply.code(201).send(service)
  })

  app.patch('/:serviceId', auth, async (request) => {
    const { serviceId } = request.params as any
    const data = request.body as any
    return prisma.service.update({ where: { id: serviceId }, data })
  })

  app.delete('/:serviceId', auth, async (request) => {
    const { serviceId } = request.params as any
    await prisma.service.update({ where: { id: serviceId }, data: { isActive: false } })
    return { ok: true }
  })
}
