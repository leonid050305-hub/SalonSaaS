import { FastifyInstance } from 'fastify'
import { prisma } from '../db'

export async function staffRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/', auth, async (request) => {
    const { salonId } = request.params as any
    return prisma.staff.findMany({
      where: { salonId, isActive: true },
      include: { staffServices: { include: { service: true } } },
    })
  })

  app.post('/', auth, async (request, reply) => {
    const { salonId } = request.params as any
    const { name, phone, role, schedule, serviceIds = [] } = request.body as any
    const staff = await prisma.staff.create({
      data: {
        salonId, name, phone, role, schedule,
        staffServices: { create: serviceIds.map((id: string) => ({ serviceId: id })) },
      },
      include: { staffServices: { include: { service: true } } },
    })
    return reply.code(201).send(staff)
  })

  app.patch('/:staffId', auth, async (request) => {
    const { staffId } = request.params as any
    const { name, phone, role, schedule, isActive } = request.body as any
    return prisma.staff.update({ where: { id: staffId }, data: { name, phone, role, schedule, isActive } })
  })
}
