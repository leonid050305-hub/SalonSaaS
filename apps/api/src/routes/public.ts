import { FastifyInstance } from 'fastify'
import { prisma } from '../db'
import { notifyBookingConfirmed } from '../utils/notifications'

// Публичные роуты для виджета онлайн-записи — без JWT
export async function publicRoutes(app: FastifyInstance) {

  // GET /public/salons/:salonId — инфо о салоне
  app.get('/salons/:salonId', async (request, reply) => {
    const { salonId } = request.params as any
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { id: true, name: true, address: true, phone: true, timezone: true },
    })
    if (!salon || !salon) return reply.code(404).send({ error: 'Салон не найден' })
    return salon
  })

  // GET /public/salons/:salonId/services — список услуг
  app.get('/salons/:salonId/services', async (request) => {
    const { salonId } = request.params as any
    return prisma.service.findMany({
      where: { salonId, isActive: true },
      select: { id: true, name: true, durationMin: true, price: true, category: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
  })

  // GET /public/salons/:salonId/staff?serviceId=... — мастера для услуги
  app.get('/salons/:salonId/staff', async (request) => {
    const { salonId }  = request.params as any
    const { serviceId } = request.query as any

    const where: any = { salonId, isActive: true }
    if (serviceId) {
      where.staffServices = { some: { serviceId } }
    }

    return prisma.staff.findMany({
      where,
      select: { id: true, name: true, role: true },
    })
  })

  // GET /public/salons/:salonId/slots?staffId=&date= — свободные слоты
  app.get('/salons/:salonId/slots', async (request) => {
    const { salonId }       = request.params as any
    const { staffId, date } = request.query as any

    if (!staffId || !date) return { slots: [] }

    const d       = new Date(date)
    const nextDay = new Date(d)
    nextDay.setDate(nextDay.getDate() + 1)

    const booked = await prisma.appointment.findMany({
      where: {
        salonId,
        staffId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        startsAt: { gte: d, lt: nextDay },
      },
      select: { startsAt: true, endsAt: true },
    })

    const takenTimes = booked.map(a =>
      new Date(a.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    )

    return { date, takenSlots: takenTimes }
  })

  // POST /public/salons/:salonId/book — создать запись (без авторизации)
  app.post('/salons/:salonId/book', async (request, reply) => {
    const { salonId } = request.params as any
    const { clientName, clientPhone, staffId, serviceId, startsAt, notes } = request.body as any

    if (!clientName || !clientPhone || !staffId || !serviceId || !startsAt) {
      return reply.code(400).send({ error: 'Заполните все обязательные поля' })
    }

    const service = await prisma.service.findFirst({ where: { id: serviceId, salonId } })
    if (!service) return reply.code(400).send({ error: 'Услуга не найдена' })

    const endsAt = new Date(new Date(startsAt).getTime() + service.durationMin * 60_000)

    // Проверяем конфликт
    const conflict = await prisma.appointment.findFirst({
      where: {
        staffId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        startsAt: { lt: endsAt },
        endsAt:   { gt: new Date(startsAt) },
      },
    })
    if (conflict) return reply.code(409).send({ error: 'Это время уже занято, выберите другое' })

    // Найти или создать клиента
    let client = await prisma.client.findFirst({ where: { salonId, phone: clientPhone } })
    if (!client) {
      client = await prisma.client.create({
        data: { salonId, name: clientName, phone: clientPhone },
      })
    }

    const appointment = await prisma.appointment.create({
      data: {
        salonId,
        clientId:   client.id,
        staffId,
        startsAt:   new Date(startsAt),
        endsAt,
        totalPrice: service.price,
        source:     'ONLINE',
        status:     'PENDING',
        notes,
        items: {
          create: [{ serviceId, price: service.price, durationMin: service.durationMin }],
        },
      },
      include: {
        client:  { select: { name: true, phone: true } },
        staff:   { select: { name: true } },
        items:   { include: { service: { select: { name: true } } } },
      },
    })

    // TODO: отправить WhatsApp-уведомление клиенту

    // Отправляем подтверждение асинхронно
    if (client.phone) {
      const salon = await prisma.salon.findUnique({ where: { id: salonId } })
      const date  = new Date(appointment.startsAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })
      const time  = new Date(appointment.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      notifyBookingConfirmed({
        phone:       client.phone,
        clientName:  client.name,
        salonName:   salon?.name ?? '',
        serviceName: service.name,
        staffName:   (appointment as any).staff.name,
        date, time,
        salonPhone:  salon?.phone ?? undefined,
        salonAddr:   salon?.address ?? undefined,
      }).catch(console.error)
    }

    return reply.code(201).send(appointment)
  })
}
