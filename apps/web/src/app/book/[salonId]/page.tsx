'use client'
import { useState, useEffect, use } from 'react'
import styles from './book.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Salon   { id: string; name: string; address?: string; phone?: string }
interface Staff   { id: string; name: string; role?: string }
interface Service { id: string; name: string; durationMin: number; price: number; category?: string }

type Step = 'service' | 'staff' | 'datetime' | 'contacts' | 'confirm' | 'done'

const STEPS: Step[] = ['service', 'staff', 'datetime', 'contacts', 'confirm', 'done']
const STEP_LABELS: Record<Step, string> = {
  service:  'Услуга',
  staff:    'Мастер',
  datetime: 'Дата и время',
  contacts: 'Контакты',
  confirm:  'Подтверждение',
  done:     'Готово',
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

async function get<T>(url: string): Promise<T> {
  const res = await fetch(`${BASE}${url}`)
  if (!res.ok) throw new Error('Ошибка загрузки')
  return res.json()
}

// ─── Time slots ───────────────────────────────────────────────────────────────
function buildSlots() {
  const slots: string[] = []
  for (let h = 9; h < 20; h++)
    for (let m of [0, 30])
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
  return slots
}
const ALL_SLOTS = buildSlots()

function getWeekDates(offset = 0) {
  const today = new Date()
  today.setDate(today.getDate() + offset * 7)
  const dow = (today.getDay() + 6) % 7
  const mon = new Date(today)
  mon.setDate(today.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d
  })
}

function fmt(d: Date) { return d.toISOString().slice(0, 10) }

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookPage({ params }: { params: Promise<{ salonId: string }> }) {
  const { salonId } = use(params)

  const [step, setStep] = useState<Step>('service')
  const [weekOffset, setWeekOffset] = useState(0)

  // Data
  const [salon, setSalon]       = useState<Salon | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff]       = useState<Staff[]>([])
  const [takenSlots, setTaken]  = useState<string[]>([])
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')

  // Selections
  const [selCategory, setSelCategory] = useState<string | null>(null)
  const [selService, setSelService]   = useState<Service | null>(null)
  const [selStaff, setSelStaff]       = useState<Staff | null>(null)
  const [selDate, setSelDate]         = useState<string>(fmt(new Date()))
  const [selTime, setSelTime]         = useState<string | null>(null)
  const [clientName, setClientName]   = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientNote, setClientNote]   = useState('')

  // Load salon + services
  useEffect(() => {
    const load = async () => {
      try {
        const [salons, svcs] = await Promise.all([
          get<Salon[]>('/api/salons'),
          get<Service[]>(`/api/salons/${salonId}/services`),
        ])
        const s = salons.find((x: any) => x.id === salonId) ?? salons[0]
        setSalon(s)
        setServices(svcs.filter(s => s !== null))
      } catch { setError('Не удалось загрузить данные салона') }
      finally  { setLoading(false) }
    }
    load()
  }, [salonId])

  // Load staff when service selected
  useEffect(() => {
    if (!selService) return
    get<Staff[]>(`/api/salons/${salonId}/staff`)
      .then(data => setStaff(data.filter((s: any) =>
        s.staffServices?.some((ss: any) => ss.service.id === selService.id)
      )))
      .catch(() => {})
  }, [selService, salonId])

  // Load taken slots when staff + date change
  useEffect(() => {
    if (!selStaff || !selDate) return
    get<any>(`/api/salons/${salonId}/appointments?staffId=${selStaff.id}&date=${selDate}`)
      .then(data => setTaken(
        (data.appointments ?? []).map((a: any) =>
          new Date(a.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        )
      ))
      .catch(() => {})
  }, [selStaff, selDate, salonId])

  const submit = async () => {
    if (!selService || !selStaff || !selTime || !clientName || !clientPhone) return
    setSubmitting(true)
    setError('')
    try {
      // Найти или создать клиента
      const clientRes = await fetch(`${BASE}/api/salons/${salonId}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clientName, phone: clientPhone }),
      })
      const client = await clientRes.json()

      // Создать запись
      await fetch(`${BASE}/api/salons/${salonId}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          staffId:  selStaff.id,
          startsAt: new Date(`${selDate}T${selTime}:00`).toISOString(),
          services: [selService.id],
          source:   'ONLINE',
          notes:    clientNote,
        }),
      })
      setStep('done')
    } catch {
      setError('Не удалось создать запись. Попробуйте ещё раз.')
    } finally {
      setSubmitting(false)
    }
  }

  const categories = [...new Set(services.map(s => s.category).filter(Boolean))] as string[]
  const filteredServices = selCategory
    ? services.filter(s => s.category === selCategory)
    : services

  const weekDates = getWeekDates(weekOffset)
  const today = new Date()

  const stepIdx    = STEPS.indexOf(step)
  const canGoBack  = stepIdx > 0 && step !== 'done'

  const goBack = () => setStep(STEPS[stepIdx - 1])

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /><p>Загрузка...</p></div>
  if (error && !salon) return <div className={styles.errorPage}><p>{error}</p></div>

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.salonInfo}>
          <div className={styles.salonLogo}>◆</div>
          <div>
            <div className={styles.salonName}>{salon?.name}</div>
            {salon?.address && <div className={styles.salonAddr}>{salon.address}</div>}
          </div>
        </div>
        {step !== 'done' && (
          <div className={styles.stepProgress}>
            {STEPS.filter(s => s !== 'done').map((s, i) => (
              <div
                key={s}
                className={`${styles.progressDot} ${
                  s === step ? styles.progressActive :
                  STEPS.indexOf(s) < stepIdx ? styles.progressDone : ''
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className={styles.body}>

        {/* ── Step: Service ── */}
        {step === 'service' && (
          <div className={`${styles.step} ${styles.fade}`}>
            <h2 className={styles.stepTitle}>Выберите услугу</h2>

            {categories.length > 1 && (
              <div className={styles.categoryTabs}>
                <button
                  className={selCategory === null ? styles.catActive : styles.catTab}
                  onClick={() => setSelCategory(null)}
                >Все</button>
                {categories.map(c => (
                  <button
                    key={c}
                    className={selCategory === c ? styles.catActive : styles.catTab}
                    onClick={() => setSelCategory(c)}
                  >{c}</button>
                ))}
              </div>
            )}

            <div className={styles.serviceList}>
              {filteredServices.map(svc => (
                <div
                  key={svc.id}
                  className={`${styles.serviceCard} ${selService?.id === svc.id ? styles.serviceSelected : ''}`}
                  onClick={() => setSelService(svc)}
                >
                  <div className={styles.serviceInfo}>
                    <div className={styles.serviceName}>{svc.name}</div>
                    <div className={styles.serviceMeta}>{svc.durationMin} мин</div>
                  </div>
                  <div className={styles.servicePrice}>{Number(svc.price).toLocaleString('ru')} ₽</div>
                  <div className={`${styles.serviceCheck} ${selService?.id === svc.id ? styles.checkOn : ''}`}>
                    {selService?.id === svc.id && '✓'}
                  </div>
                </div>
              ))}
            </div>

            <button
              className={styles.nextBtn}
              disabled={!selService}
              onClick={() => setStep('staff')}
            >Далее →</button>
          </div>
        )}

        {/* ── Step: Staff ── */}
        {step === 'staff' && (
          <div className={`${styles.step} ${styles.fade}`}>
            <h2 className={styles.stepTitle}>Выберите мастера</h2>
            <p className={styles.stepSub}>Для услуги «{selService?.name}»</p>

            <div className={styles.staffList}>
              {staff.length === 0 && (
                <p className={styles.noData}>Загрузка мастеров...</p>
              )}
              {staff.map(s => (
                <div
                  key={s.id}
                  className={`${styles.staffCard} ${selStaff?.id === s.id ? styles.staffSelected : ''}`}
                  onClick={() => setSelStaff(s)}
                >
                  <div className={styles.staffAvatar}>{s.name.split(' ').slice(0,2).map(p=>p[0]).join('')}</div>
                  <div>
                    <div className={styles.staffName}>{s.name}</div>
                    {s.role && <div className={styles.staffRole}>{s.role}</div>}
                  </div>
                  {selStaff?.id === s.id && <div className={styles.staffCheck}>✓</div>}
                </div>
              ))}
              <div
                className={`${styles.staffCard} ${styles.staffAny} ${selStaff === null && step === 'staff' ? '' : ''}`}
                onClick={() => {
                  setSelStaff(staff[0] ?? null)
                }}
              >
                <div className={styles.staffAvatar} style={{background:'var(--bg4)'}}>◎</div>
                <div>
                  <div className={styles.staffName}>Любой свободный</div>
                  <div className={styles.staffRole}>Система выберет мастера</div>
                </div>
              </div>
            </div>

            <button
              className={styles.nextBtn}
              disabled={!selStaff}
              onClick={() => setStep('datetime')}
            >Далее →</button>
          </div>
        )}

        {/* ── Step: Date & Time ── */}
        {step === 'datetime' && (
          <div className={`${styles.step} ${styles.fade}`}>
            <h2 className={styles.stepTitle}>Выберите дату и время</h2>

            {/* Week nav */}
            <div className={styles.weekNav}>
              <button
                className={styles.weekBtn}
                onClick={() => { setWeekOffset(w => w - 1); setSelTime(null) }}
                disabled={weekOffset === 0}
              >←</button>
              <span className={styles.weekLabel}>
                {weekDates[0].toLocaleDateString('ru-RU', { day:'numeric', month:'short' })} –{' '}
                {weekDates[6].toLocaleDateString('ru-RU', { day:'numeric', month:'short' })}
              </span>
              <button className={styles.weekBtn} onClick={() => { setWeekOffset(w => w + 1); setSelTime(null) }}>→</button>
            </div>

            {/* Day picker */}
            <div className={styles.dayPicker}>
              {weekDates.map(d => {
                const dateStr = fmt(d)
                const isPast  = d < today && dateStr !== fmt(today)
                const isToday = dateStr === fmt(today)
                const isSel   = dateStr === selDate
                return (
                  <button
                    key={dateStr}
                    className={`${styles.dayBtn} ${isSel ? styles.daySelected : ''} ${isPast ? styles.dayPast : ''} ${isToday ? styles.dayToday : ''}`}
                    onClick={() => { if (!isPast) { setSelDate(dateStr); setSelTime(null) } }}
                    disabled={isPast}
                  >
                    <span className={styles.dayName}>
                      {d.toLocaleDateString('ru-RU', { weekday: 'short' })}
                    </span>
                    <span className={styles.dayNum}>{d.getDate()}</span>
                  </button>
                )
              })}
            </div>

            {/* Time slots */}
            <div className={styles.timeGrid}>
              {ALL_SLOTS.map(t => {
                const busy = takenSlots.includes(t)
                const sel  = selTime === t
                return (
                  <button
                    key={t}
                    className={`${styles.timeSlot} ${busy ? styles.timeBusy : sel ? styles.timeSelected : ''}`}
                    disabled={busy}
                    onClick={() => setSelTime(t)}
                  >{t}</button>
                )
              })}
            </div>

            <button
              className={styles.nextBtn}
              disabled={!selTime}
              onClick={() => setStep('contacts')}
            >Далее →</button>
          </div>
        )}

        {/* ── Step: Contacts ── */}
        {step === 'contacts' && (
          <div className={`${styles.step} ${styles.fade}`}>
            <h2 className={styles.stepTitle}>Ваши контакты</h2>
            <p className={styles.stepSub}>Мы пришлём подтверждение записи</p>

            <div className={styles.contactForm}>
              <div className={styles.field}>
                <label>Ваше имя *</label>
                <input
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Анна Петрова"
                  autoFocus
                />
              </div>
              <div className={styles.field}>
                <label>Телефон *</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="+7 900 000-00-00"
                />
              </div>
              <div className={styles.field}>
                <label>Комментарий</label>
                <textarea
                  value={clientNote}
                  onChange={e => setClientNote(e.target.value)}
                  placeholder="Пожелания к записи..."
                  rows={3}
                />
              </div>
            </div>

            <button
              className={styles.nextBtn}
              disabled={!clientName || !clientPhone}
              onClick={() => setStep('confirm')}
            >Далее →</button>
          </div>
        )}

        {/* ── Step: Confirm ── */}
        {step === 'confirm' && (
          <div className={`${styles.step} ${styles.fade}`}>
            <h2 className={styles.stepTitle}>Подтвердите запись</h2>

            <div className={styles.summary}>
              <SumRow icon="◇" label="Услуга"   val={selService!.name} />
              <SumRow icon="◎" label="Мастер"   val={selStaff!.name} />
              <SumRow icon="◷" label="Дата"     val={new Date(selDate).toLocaleDateString('ru-RU', { weekday:'long', day:'numeric', month:'long' })} />
              <SumRow icon="◷" label="Время"    val={`${selTime} · ${selService!.durationMin} мин`} />
              <SumRow icon="◉" label="Клиент"   val={clientName} />
              <SumRow icon="◉" label="Телефон"  val={clientPhone} />
              {clientNote && <SumRow icon="✎" label="Комментарий" val={clientNote} />}
              <div className={styles.summaryTotal}>
                <span>Итого</span>
                <span>{Number(selService!.price).toLocaleString('ru')} ₽</span>
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              className={styles.submitBtn}
              disabled={submitting}
              onClick={submit}
            >
              {submitting ? <span className={styles.btnSpinner} /> : 'Записаться'}
            </button>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === 'done' && (
          <div className={`${styles.step} ${styles.fade} ${styles.doneStep}`}>
            <div className={styles.doneIcon}>✓</div>
            <h2 className={styles.doneTitle}>Вы записаны!</h2>
            <p className={styles.doneSub}>
              Ждём вас {new Date(selDate).toLocaleDateString('ru-RU', { day:'numeric', month:'long' })} в {selTime}
            </p>
            <div className={styles.doneDetails}>
              <div>{salon?.name}</div>
              <div>{selService?.name} · {selStaff?.name}</div>
              {salon?.address && <div>{salon.address}</div>}
              {salon?.phone   && <div>{salon.phone}</div>}
            </div>
            <p className={styles.doneNote}>Подтверждение придёт на номер {clientPhone}</p>
          </div>
        )}
      </div>

      {/* Back button */}
      {canGoBack && (
        <button className={styles.backBtn} onClick={goBack}>← Назад</button>
      )}
    </div>
  )
}

function SumRow({ icon, label, val }: { icon: string; label: string; val: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:13, color:'var(--text3)' }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:500, color:'var(--text)', textAlign:'right', maxWidth:'60%' }}>{val}</span>
    </div>
  )
}
