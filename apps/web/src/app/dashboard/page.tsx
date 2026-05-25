'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useDashboardStats, updateAppointmentStatus } from '@/lib/hooks'
import { NewAppointmentModal } from '@/components/NewAppointmentModal'
import styles from './page.module.css'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  COMPLETED:   { label: 'Завершено',     cls: 'green'  },
  IN_PROGRESS: { label: 'Идёт',          cls: 'blue'   },
  CONFIRMED:   { label: 'Подтверждено',  cls: 'accent' },
  PENDING:     { label: 'Ожидает',       cls: 'gray'   },
  CANCELLED:   { label: 'Отменено',      cls: 'red'    },
  NO_SHOW:     { label: 'Не пришёл',     cls: 'red'    },
}

export default function DashboardPage() {
  const { salon } = useAuth()
  const { loading, reload, todayCount, revenueToday, clientsTotal, completionRate, todayAppointments } =
    useDashboardStats(salon?.id ?? null)

  const [showModal, setShowModal] = useState(false)
  const [menuOpen, setMenuOpen]   = useState<string | null>(null)

  const now = new Date()
  const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  const changeStatus = async (aptId: string, status: string) => {
    if (!salon) return
    await updateAppointmentStatus(salon.id, aptId, status)
    setMenuOpen(null)
    reload()
  }

  return (
    <div>
      <div className={`${styles.header} fade-up`}>
        <div>
          <h1 className={styles.title}>Дашборд</h1>
          <p className={styles.date}>{dateStr}</p>
        </div>
        <button className={styles.newBtn} onClick={() => setShowModal(true)}>+ Новая запись</button>
      </div>

      {/* Stats */}
      <div className={`${styles.stats} fade-up delay-1`}>
        <div className={styles.stat}>
          <span className={styles.statVal}>{loading ? '—' : todayCount}</span>
          <span className={styles.statLabel}>Записей сегодня</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{loading ? '—' : revenueToday.toLocaleString('ru') + ' ₽'}</span>
          <span className={styles.statLabel}>Выручка сегодня</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{loading ? '—' : clientsTotal}</span>
          <span className={styles.statLabel}>Всего клиентов</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{loading ? '—' : completionRate + '%'}</span>
          <span className={styles.statLabel}>Выполнение записей</span>
        </div>
      </div>

      {/* Today's appointments */}
      <div className={`${styles.section} fade-up delay-2`}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Сегодня</h2>
          <a href="/dashboard/calendar" className={styles.seeAll}>Весь календарь →</a>
        </div>

        {loading && <div className={styles.loader}>Загрузка...</div>}

        {!loading && todayAppointments.length === 0 && (
          <div className={styles.empty}>Записей на сегодня нет</div>
        )}

        <div className={styles.appointments}>
          {todayAppointments.map((a: any, i: number) => {
            const st = STATUS_MAP[a.status] ?? STATUS_MAP.PENDING
            const time = new Date(a.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
            return (
              <div key={a.id} className={`${styles.apt} fade-up`} style={{ animationDelay: `${i * 0.04}s` }}>
                <div className={styles.aptTime}>{time}</div>
                <div className={styles.aptBar} data-status={a.status} />
                <div className={styles.aptMain}>
                  <div className={styles.aptClient}>{a.client?.name}</div>
                  <div className={styles.aptService}>
                    {a.items?.map((it: any) => it.service?.name).join(', ')}
                  </div>
                </div>
                <div className={styles.aptMaster}>{a.staff?.name}</div>
                <div className={styles.aptPrice}>{Number(a.totalPrice).toLocaleString('ru')} ₽</div>
                <div className={`${styles.aptStatus} ${styles[st.cls]}`}>{st.label}</div>

                <div className={styles.aptMenuWrap}>
                  <button className={styles.aptMenu} onClick={() => setMenuOpen(menuOpen === a.id ? null : a.id)}>···</button>
                  {menuOpen === a.id && (
                    <div className={styles.dropdown}>
                      <button onClick={() => changeStatus(a.id, 'CONFIRMED')}>Подтвердить</button>
                      <button onClick={() => changeStatus(a.id, 'IN_PROGRESS')}>Начать</button>
                      <button onClick={() => changeStatus(a.id, 'COMPLETED')}>Завершить</button>
                      <button onClick={() => changeStatus(a.id, 'NO_SHOW')} className={styles.ddRed}>Не пришёл</button>
                      <button onClick={() => changeStatus(a.id, 'CANCELLED')} className={styles.ddRed}>Отменить</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showModal && salon && (
        <NewAppointmentModal
          salonId={salon.id}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); reload() }}
        />
      )}
    </div>
  )
}
