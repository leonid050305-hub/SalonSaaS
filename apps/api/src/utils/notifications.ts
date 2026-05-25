// ─── Green API (WhatsApp) + SMS fallback ──────────────────────────────────────
// Документация: https://green-api.com/docs/api/sending/

interface NotifyPayload {
  phone:       string
  clientName:  string
  salonName:   string
  serviceName: string
  staffName:   string
  date:        string
  time:        string
  salonPhone?: string
  salonAddr?:  string
}

// ─── Green API ────────────────────────────────────────────────────────────────

async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  const idInstance       = process.env.GREEN_API_ID
  const apiTokenInstance = process.env.GREEN_API_TOKEN

  if (!idInstance || !apiTokenInstance) {
    console.warn('[WhatsApp] GREEN_API_ID / GREEN_API_TOKEN не настроены')
    return false
  }

  // Нормализуем номер: только цифры, начинается с 7
  const phone = to.replace(/\D/g, '').replace(/^8/, '7')
  // Green API требует формат: 79XXXXXXXXX@c.us
  const chatId = `${phone}@c.us`

  try {
    const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chatId, message }),
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('[WhatsApp] Ошибка Green API:', err)
      return false
    }

    console.log(`[WhatsApp] Отправлено на ${phone}`)
    return true
  } catch (e) {
    console.error('[WhatsApp] Ошибка сети:', e)
    return false
  }
}

// ─── SMS fallback (SMSC.ru) ───────────────────────────────────────────────────

async function sendSMS(to: string, text: string): Promise<boolean> {
  const login    = process.env.SMS_LOGIN
  const password = process.env.SMS_PASSWORD

  if (!login || !password) {
    console.warn('[SMS] Не настроен, пропускаем')
    return false
  }

  const phone = to.replace(/\D/g, '').replace(/^8/, '7')

  try {
    const url = new URL('https://smsc.ru/sys/send.php')
    url.searchParams.set('login',   login)
    url.searchParams.set('psw',     password)
    url.searchParams.set('phones',  phone)
    url.searchParams.set('mes',     text)
    url.searchParams.set('charset', 'utf-8')
    url.searchParams.set('fmt',     '3')

    const res  = await fetch(url.toString())
    const data = await res.json()
    if (data.error_code) { console.error('[SMS] Ошибка:', data); return false }
    console.log(`[SMS] Отправлено на ${phone}`)
    return true
  } catch (e) {
    console.error('[SMS] Ошибка:', e)
    return false
  }
}

// ─── Публичные функции ────────────────────────────────────────────────────────

export async function notifyBookingConfirmed(p: NotifyPayload) {
  const msg =
    `✅ *Запись подтверждена!*\n\n` +
    `👤 ${p.clientName}\n` +
    `📅 ${p.date}, ${p.time}\n` +
    `✂️ ${p.serviceName}\n` +
    `💇 Мастер: ${p.staffName}\n` +
    `🏠 ${p.salonName}` +
    (p.salonAddr  ? `\n📍 ${p.salonAddr}`  : '') +
    (p.salonPhone ? `\n📞 ${p.salonPhone}` : '') +
    `\n\nЖдём вас! 🌸`

  const sent = await sendWhatsApp(p.phone, msg)
  if (!sent) await sendSMS(p.phone,
    `✓ Запись: ${p.date} ${p.time}, ${p.serviceName}, ${p.salonName}`
  )
}

export async function notifyBookingReminder(p: NotifyPayload) {
  const msg =
    `⏰ *Напоминание о записи завтра*\n\n` +
    `${p.time} — ${p.serviceName}\n` +
    `Мастер: ${p.staffName}\n` +
    `${p.salonName}` +
    (p.salonAddr  ? `\n📍 ${p.salonAddr}`  : '') +
    (p.salonPhone ? `\n📞 ${p.salonPhone}` : '')

  const sent = await sendWhatsApp(p.phone, msg)
  if (!sent) await sendSMS(p.phone,
    `Напоминание: завтра ${p.time} — ${p.serviceName}, ${p.salonName}`
  )
}

export async function notifyBookingCancelled(p: NotifyPayload) {
  const msg =
    `❌ *Запись отменена*\n\n` +
    `${p.date}, ${p.time} — ${p.serviceName}\n\n` +
    `Для новой записи: ${p.salonPhone ?? p.salonName}`

  const sent = await sendWhatsApp(p.phone, msg)
  if (!sent) await sendSMS(p.phone,
    `Запись ${p.date} ${p.time} отменена. ${p.salonPhone ?? p.salonName}`
  )
}
