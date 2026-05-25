'use client'
import { useState, useEffect, useCallback } from 'react'
import styles from './NewAppointmentModal.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client  { id: string; name: string; phone: string; loyaltyPoints: number }
interface Staff   { id: string; name: string; role: string; staffServices: { service: Service }[] }
interface Service { id: string; name: string; durationMin: number; price: number; category: string }

interface Props {
  salonId: string
  onClose: () => void
  onCreated: () => void
}

type Step = 1 | 2 | 3 | 4 | 5

const STEP_LABELS: Record<Step, string> = {
  1: 'Клиент', 2: 'Мастер', 3: 'Услуги', 4: 'Время', 5: 'Итого',
}

// ─── Time slots ───────────────────────────────────────────────────────────────

function buildSlots(start = 9, end = 20, step = 30) {
  const slots: string[] = []
  for (let h = start; h < end; h++) {
    for (let m = 0; m < 60; m += step) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}
const ALL_SLOTS = buildSlots()

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(p => p[0]).join('')
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NewAppointmentModal({ salonId, onClose, onCreated }: Props) {
  const [step, setStep]         = useState<Step>(1)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [saving, setSaving]     = useState(false)

  // Data
  const [clients, setClients]   = useState<Client[]>([])
  const [staff, setStaff]       = useState<Staff[]>([])
  const [takenSlots, setTaken]  = useState<string[]>([])

  // Selections
  const [search, setSearch]         = useState('')
  const [selClient, setSelClient]   = useState<Client | null>(null)
  const [selStaff, setSelStaff]     = useState<Staff | null>(null)
  const [selServices, setSelSvcs]   = useState<Service[]>([])
  const [selDate, setSelDate]       = useState(new Date().toISOString().slice(0, 10))
  const [selTime, setSelTime]       = useState<string | null>(null)
  const [notify, setNotify]         = useState(true)

  // ── Load data on mount ────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [c, s] = await Promise.all([
          fetch(`/api/salons/${salonId}/clients`, { credentials: 'include' }).then(r => r.json()),
          fetch(`/api/salons/${salonId}/staff`,   { credentials: 'include' }).then(r => r.json()),
        ])
        setClients(c.clients ?? [])
        setStaff(s ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [salonId])

  // ── Load taken slots when staff + date change ─────────────────────────────

  useEffect(() => {
    if (!selStaff || !selDate) return
    fetch(`/api/salons/${salonId}/appointments?staffId=${selStaff.id}&date=${selDate}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const taken = (data.appointments ?? []).map((a: any) =>
          new Date(a.startsAt).toTimeString().slice(0, 5)
        )
        setTaken(taken)
      })
  }, [selStaff, selDate, salonId])

  // ── Navigation ────────────────────────────────────────────────────────────

  const canNext = useCallback(() => {
    if (step === 1) return !!selClient
    if (step === 2) return !!selStaff
    if (step === 3) return selServices.length > 0
    if (step === 4) return !!selTime
    return true
  }, [step, selClient, selStaff, selServices, selTime])

  const next = async () => {
    if (step === 5) { await submit(); return }
    if (canNext()) setStep(s => (s + 1) as Step)
  }
  const back = () => { if (step > 1) setStep(s => (s - 1) as Step) }

  // ── Submit ────────────────────────────────────────────────────────────────

  const submit = async () => {
    if (!selClient || !selStaff || !selTime) return
    setSaving(true)
    setError('')
    try {
      const startsAt = new Date(`${selDate}T${selTime}:00`).toISOString()
      const res = await fetch(`/api/salons/${salonId}/appointments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selClient.id,
          staffId:  selStaff.id,
          startsAt,
          services: selServices.map(s => s.id),
          source:   'MANUAL',
        }),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error ?? 'Ошибка')
      }
      onCreated()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Services available for selected staff ─────────────────────────────────

  const availableServices: Service[] = selStaff
    ? selStaff.staffServices.map(ss => ss.service)
    : []

  const totalPrice = selServices.reduce((s, x) => s + Number(x.price), 0)
  const totalMin   = selServices.reduce((s, x) => s + x.durationMin, 0)

  const toggleService = (svc: Service) => {
    setSelSvcs(prev =>
      prev.find(s => s.id === svc.id) ? prev.filter(s => s.id !== svc.id) : [...prev, svc]
    )
  }

  // ── Filtered clients ──────────────────────────────────────────────────────

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Новая запись">

        {/* Header */}
        <div className={styles.head}>
          <span className={styles.title}>Новая запись</span>
          <button className={styles.close} onClick={onClose} aria-label="Закрыть">✕</button>
        </div>

        {/* Steps */}
        <div className={styles.steps}>
          {([1, 2, 3, 4, 5] as Step[]).map((n, i) => (
            <>
              <div
                key={n}
                className={`${styles.step} ${n < step ? styles.done : n === step ? styles.active : ''}`}
                onClick={() => n < step && setStep(n)}
              >
                <div className={styles.dot}>
                  {n < step ? '✓' : n}
                </div>
                <span className={styles.stepLbl}>{STEP_LABELS[n]}</span>
              </div>
              {i < 4 && <div className={styles.div} key={`d${n}`} />}
            </>
          ))}
        </div>

        {/* Body */}
        <div className={styles.body}>
          {loading && <div className={styles.loader}>Загрузка...</div>}

          {/* Step 1 — Client */}
          {!loading && step === 1 && (
            <div className={styles.fade}>
              <div className={styles.sectionTitle}>Выберите клиента</div>
              <div className={styles.searchWrap}>
                <span className={styles.searchIcon}>◎</span>
                <input
                  className={styles.searchInput}
                  placeholder="Поиск по имени или телефону..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className={styles.list}>
                {filteredClients.map(c => (
                  <div
                    key={c.id}
                    className={`${styles.clientRow} ${selClient?.id === c.id ? styles.sel : ''}`}
                    onClick={() => setSelClient(c)}
                  >
                    <div className={styles.avatar}>{initials(c.name)}</div>
                    <div>
                      <div className={styles.clientName}>{c.name}</div>
                      <div className={styles.clientSub}>{c.phone}</div>
                    </div>
                  </div>
                ))}
                <div className={styles.newClient}>
                  <span>+ Новый клиент</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Staff */}
          {!loading && step === 2 && (
            <div className={styles.fade}>
              <div className={styles.sectionTitle}>Выберите мастера</div>
              <div className={styles.staffGrid}>
                {staff.map(s => (
                  <div
                    key={s.id}
                    className={`${styles.staffCard} ${selStaff?.id === s.id ? styles.sel : ''}`}
                    onClick={() => { setSelStaff(s); setSelSvcs([]) }}
                  >
                    <div className={styles.staffAvatar}>{initials(s.name)}</div>
                    <div className={styles.staffName}>{s.name}</div>
                    <div className={styles.staffRole}>{s.role}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Services */}
          {!loading && step === 3 && (
            <div className={styles.fade}>
              <div className={styles.sectionTitle}>Выберите услуги</div>
              <div className={styles.svcList}>
                {availableServices.map(svc => {
                  const on = !!selServices.find(s => s.id === svc.id)
                  return (
                    <div
                      key={svc.id}
                      className={`${styles.svcRow} ${on ? styles.sel : ''}`}
                      onClick={() => toggleService(svc)}
                    >
                      <div className={styles.svcLeft}>
                        <div className={`${styles.checkbox} ${on ? styles.checked : ''}`}>
                          {on && '✓'}
                        </div>
                        <div>
                          <div className={styles.svcName}>{svc.name}</div>
                          <div className={styles.svcDur}>{svc.durationMin} мин</div>
                        </div>
                      </div>
                      <div className={styles.svcPrice}>{Number(svc.price).toLocaleString('ru')} ₽</div>
                    </div>
                  )
                })}
              </div>
              {selServices.length > 0 && (
                <div className={styles.total}>
                  <span>{selServices.length} усл. · {totalMin} мин</span>
                  <span>{totalPrice.toLocaleString('ru')} ₽</span>
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Time */}
          {!loading && step === 4 && (
            <div className={styles.fade}>
              <div className={styles.sectionTitle}>Выберите дату и время</div>
              <div className={styles.dateRow}>
                <span className={styles.dateLbl}>Дата:</span>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={selDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => { setSelDate(e.target.value); setSelTime(null) }}
                />
              </div>
              <div className={styles.timeGrid}>
                {ALL_SLOTS.map(t => {
                  const busy = takenSlots.includes(t)
                  const on   = selTime === t
                  return (
                    <div
                      key={t}
                      className={`${styles.timeSlot} ${busy ? styles.busy : on ? styles.sel : ''}`}
                      onClick={() => !busy && setSelTime(t)}
                    >
                      {t}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 5 — Summary */}
          {!loading && step === 5 && (
            <div className={styles.fade}>
              <div className={styles.sectionTitle}>Подтвердите запись</div>
              <div className={styles.summary}>
                <SumRow label="Клиент"  val={selClient!.name} />
                <SumRow label="Мастер"  val={selStaff!.name} />
                <SumRow label="Услуги"  val={selServices.map(s => s.name).join(', ')} />
                <SumRow label="Время"   val={`${selDate} в ${selTime} · ${totalMin} мин`} />
                <div className={styles.notifyRow}>
                  <span>WhatsApp-напоминание клиенту</span>
                  <label className={styles.toggle}>
                    <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} />
                    <span className={styles.slider} />
                  </label>
                </div>
                <div className={styles.grandTotal}>
                  <span>Итого</span>
                  <span>{totalPrice.toLocaleString('ru')} ₽</span>
                </div>
              </div>
              {error && <div className={styles.error}>{error}</div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.foot}>
          <span className={styles.hint}>Шаг {step} из 5</span>
          <div className={styles.footBtns}>
            {step > 1 && <button className={styles.btnBack} onClick={back}>Назад</button>}
            <button
              className={styles.btnNext}
              onClick={next}
              disabled={!canNext() || saving}
            >
              {saving ? '...' : step === 5 ? 'Создать запись ✓' : 'Далее →'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

function SumRow({ label, val }: { label: string; val: string }) {
  return (
    <div className={styles.sumRow}>
      <span className={styles.sumLbl}>{label}</span>
      <span className={styles.sumVal}>{val}</span>
    </div>
  )
}
