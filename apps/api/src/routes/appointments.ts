import { FastifyInstance } from 'fastify'
import { prisma } from '../db'
import { notifyBookingConfirmed, notifyBookingCancelled } from '../utils/notifications'

export async function appointmentRoutes(app: FastifyInstance) {

  const auth = { preHandler: [app.authenticate] }

  // GET /api/salons/:salonId/appointments?date=2024-03-15&staffId=...&status=...
  app.get('/', auth, async (request) => {
    const { salonId } = request.params as any
    const { date, staffId, status, page = '1', limit = '50' } = request.query as any

    const where: any = { salonId }
    if (staffId) where.staffId = staffId
    if (status) where.status = status
    if (date) {
      const d = new Date(date)
      const nextDay = new Date(d)
      nextDay.setDate(nextDay.getDate() + 1)
      where.startsAt = { gte: d, lt: nextDay }
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, phone: true } },
          staff: { select: { id: true, name: true } },
          items: { include: { service: { select: { id: true, name: true } } } },
        },
        orderBy: { startsAt: 'asc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.appointment.count({ where }),
    ])

    return { appointments, total, page: Number(page), limit: Number(limit) }
  })

  // POST /api/salons/:salonId/appointments
  app.post('/', auth, async (request, reply) => {
    const { salonId } = request.params as any
    const { clientId, staffId, startsAt, services, notes, source = 'MANUAL' } = request.body as any

    if (!clientId || !staffId || !startsAt || !services?.length) {
      return reply.code(400).send({ error: 'Заполните обязательные поля' })
    }

    // Получаем все услуги из базы
    const serviceRecords = await prisma.service.findMany({
      where: { id: { in: services }, salonId },
    })

    if (serviceRecords.length !== services.length) {
      return reply.code(400).send({ error: 'Одна или несколько услуг не найдены' })
    }

    // Считаем время окончания и сумму
    const totalMin = serviceRecords.reduce((sum, s) => sum + s.durationMin, 0)
    const totalPrice = serviceRecords.reduce((sum, s) => sum + Number(s.price), 0)
    const endsAt = new Date(new Date(startsAt).getTime() + totalMin * 60_000)

    // Проверяем конфликты в расписании мастера
    const conflict = await prisma.appointment.findFirst({
      where: {
        staffId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        OR: [
          { startsAt: { lt: endsAt }, endsAt: { gt: new Date(startsAt) } },
        ],
      },
    })

    if (conflict) {
      return reply.code(409).send({ error: 'Мастер уже занят в это время' })
    }

    const appointment = await prisma.appointment.create({
      data: {
        salonId,
        clientId,
        staffId,
        startsAt: new Date(startsAt),
        endsAt,
        totalPrice,
        notes,
        source,
        items: {
          create: serviceRecords.map((s) => ({
            serviceId: s.id,
            price: s.price,
            durationMin: s.durationMin,
          })),
        },
      },
      include: {
        client: true,
        staff: true,
        items: { include: { service: true } },
      },
    })

    // TODO: отправить уведомление клиенту (WhatsApp / SMS)

    // Отправляем подтверждение асинхронно (не блокируем ответ)
    if (appointment.client.phone) {
      const salon = await prisma.salon.findUnique({ where: { id: salonId } })
      const date  = new Date(appointment.startsAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })
      const time  = new Date(appointment.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      notifyBookingConfirmed({
        phone:       appointment.client.phone,
        clientName:  appointment.client.name,
        salonName:   salon?.name ?? '',
        serviceName: appointment.items.map((i: any) => i.service.name).join(', '),
        staffName:   appointment.staff.name,
        date, time,
        salonPhone:  salon?.phone ?? undefined,
        salonAddr:   salon?.address ?? undefined,
      }).catch(console.error)
    }

    return reply.code(201).send(appointment)
  })

  // PATCH /api/salons/:salonId/appointments/:id/status
  app.patch('/:id/status', auth, async (request, reply) => {
    const { id } = request.params as any
    const { status } = request.body as any

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
    })

    // Если визит завершён — обновляем lastVisitAt клиента
    if (status === 'COMPLETED') {
      await prisma.client.update({
        where: { id: appointment.clientId },
        data: { lastVisitAt: new Date() },
      })
    }

    return appointment
  })

  // DELETE /api/salons/:salonId/appointments/:id  (отмена)
  app.delete('/:id', auth, async (request) => {
    const { salonId, id } = request.params as any

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        client: true,
        staff:  true,
        salon:  true,
        items:  { include: { service: true }, take: 1 },
      },
    })

    // Уведомляем клиента об отмене
    if (appointment.client.phone) {
      const date = new Date(appointment.startsAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
      const time = new Date(appointment.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      notifyBookingCancelled({
        phone:       appointment.client.phone,
        clientName:  appointment.client.name,
        salonName:   appointment.salon.name,
        serviceName: appointment.items[0]?.service.name ?? '',
        staffName:   appointment.staff.name,
        date, time,
        salonPhone:  appointment.salon.phone ?? undefined,
      }).catch(console.error)
    }

    return { ok: true }
  })
}
