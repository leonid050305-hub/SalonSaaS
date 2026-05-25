import { prisma } from '@salon/db'
import { notifyBookingReminder } from './notifications'

// Запускается каждый час через setInterval
// В продакшене лучше использовать pg_cron или внешний планировщик

export function startReminderCron() {
  const INTERVAL_MS = 60 * 60 * 1000 // каждый час

  const run = async () => {
    try {
      await sendReminders()
    } catch (e) {
      console.error('[Cron] Ошибка при отправке напоминаний:', e)
    }
  }

  // Первый запуск сразу
  run()
  // Потом каждый час
  setInterval(run, INTERVAL_MS)
  console.log('[Cron] Планировщик напоминаний запущен')
}

async function sendReminders() {
  const now       = new Date()
  const in24h     = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const in25h     = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  // Находим записи которые начнутся через 24-25 часов
  // и которым ещё не отправляли напоминание
  const appointments = await prisma.appointment.findMany({
    where: {
      startsAt: { gte: in24h, lt: in25h },
      status:   { in: ['PENDING', 'CONFIRMED'] },
    },
    include: {
      client: true,
      staff:  true,
      salon:  true,
      items:  { include: { service: true }, take: 1 },
    },
  })

  if (appointments.length === 0) return

  console.log(`[Cron] Отправляем напоминания: ${appointments.length} записей`)

  for (const apt of appointments) {
    if (!apt.client.phone) continue

    const date = new Date(apt.startsAt).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', weekday: 'long',
    })
    const time = new Date(apt.startsAt).toLocaleTimeString('ru-RU', {
      hour: '2-digit', minute: '2-digit',
    })
    const serviceName = apt.items[0]?.service.name ?? 'Услуга'

    await notifyBookingReminder({
      phone:       apt.client.phone,
      clientName:  apt.client.name,
      salonName:   apt.salon.name,
      serviceName,
      staffName:   apt.staff.name,
      date,
      time,
      salonPhone:  apt.salon.phone ?? undefined,
      salonAddr:   apt.salon.address ?? undefined,
    })

    // Небольшая пауза между отправками чтобы не превысить лимиты API
    await new Promise(r => setTimeout(r, 200))
  }
}
