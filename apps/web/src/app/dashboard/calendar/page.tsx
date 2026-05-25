'use client'
import { useState } from 'react'
import styles from './calendar.module.css'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9) // 09:00–20:00
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const STAFF = [
  { id: '1', name: 'Мария К.',   color: '#d4a96a' },
  { id: '2', name: 'Ольга С.',   color: '#7aabdc' },
  { id: '3', name: 'Татьяна В.', color: '#6bbf8e' },
]

// Mock appointments: { staffId, day(0-6), startHour, durationH, client, service }
const APTS = [
  { id:'1', staffId:'1', day:0, startHour:9,    dur:1.5, client:'Анна П.',    service:'Стрижка',       status:'COMPLETED'   },
  { id:'2', staffId:'2', day:0, startHour:10.5, dur:3,   client:'Светлана И.',service:'Окрашивание',   status:'IN_PROGRESS' },
  { id:'3', staffId:'3', day:0, startHour:11,   dur:1,   client:'Елена С.',   service:'Маникюр',       status:'CONFIRMED'   },
  { id:'4', staffId:'1', day:0, startHour:13,   dur:1,   client:'Ирина К.',   service:'Брови',         status:'CONFIRMED'   },
  { id:'5', staffId:'2', day:1, startHour:9.5,  dur:1,   client:'Ольга Н.',   service:'Стрижка',       status:'CONFIRMED'   },
  { id:'6', staffId:'3', day:1, startHour:11,   dur:1.5, client:'Марина В.',  service:'Педикюр',       status:'CONFIRMED'   },
  { id:'7', staffId:'1', day:2, startHour:10,   dur:2,   client:'Наталья Р.', service:'Ламинирование', status:'CONFIRMED'   },
  { id:'8', staffId:'2', day:3, startHour:9,    dur:1,   client:'Диана М.',   service:'Стрижка',       status:'PENDING'     },
  { id:'9', staffId:'3', day:4, startHour:14,   dur:1,   client:'Виктория Л.',service:'Маникюр',       status:'PENDING'     },
]

export default function CalendarPage() {
  const [activeStaff, setActiveStaff] = useState<string | null>(null)

  const today = new Date()
  // Get start of current week (Monday)
  const startOfWeek = new Date(today)
  const dow = (today.getDay() + 6) % 7
  startOfWeek.setDate(today.getDate() - dow)

  const weekDates = DAYS.map((_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  const visibleApts = activeStaff
    ? APTS.filter(a => a.staffId === activeStaff)
    : APTS

  const GRID_START = 9   // 09:00
  const GRID_HOURS = 12  // 09–21
  const SLOT_H = 64      // px per hour

  return (
    <div>
      <div className={`${styles.header} fade-up`}>
        <div>
          <h1 className={styles.title}>Календарь</h1>
          <p className={styles.week}>
            {weekDates[0].toLocaleDateString('ru-RU', { day:'numeric', month:'long' })} —{' '}
            {weekDates[6].toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <div className={styles.controls}>
          <button className={styles.navBtn}>←</button>
          <button className={styles.todayBtn}>Сегодня</button>
          <button className={styles.navBtn}>→</button>
          <button className={styles.newBtn}>+ Запись</button>
        </div>
      </div>

      {/* Staff filter */}
      <div className={`${styles.staffFilter} fade-up delay-1`}>
        <button
          className={activeStaff === null ? styles.staffChipActive : styles.staffChip}
          onClick={() => setActiveStaff(null)}
        >Все мастера</button>
        {STAFF.map(s => (
          <button
            key={s.id}
            className={activeStaff === s.id ? styles.staffChipActive : styles.staffChip}
            style={activeStaff === s.id ? { borderColor: s.color, color: s.color } : {}}
            onClick={() => setActiveStaff(activeStaff === s.id ? null : s.id)}
          >
            <span className={styles.staffDot} style={{ background: s.color }} />
            {s.name}
          </button>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`${styles.calWrap} fade-up delay-2`}>
        {/* Day headers */}
        <div className={styles.calHead}>
          <div className={styles.timeGutter} />
          {DAYS.map((day, i) => {
            const d = weekDates[i]
            const isToday = d.toDateString() === today.toDateString()
            return (
              <div key={day} className={`${styles.dayHead} ${isToday ? styles.todayHead : ''}`}>
                <span className={styles.dayName}>{day}</span>
                <span className={`${styles.dayNum} ${isToday ? styles.todayNum : ''}`}>
                  {d.getDate()}
                </span>
              </div>
            )
          })}
        </div>

        {/* Grid body */}
        <div className={styles.calBody} style={{ height: GRID_HOURS * SLOT_H }}>
          {/* Time labels */}
          <div className={styles.timeCol}>
            {HOURS.map(h => (
              <div key={h} className={styles.timeLabel} style={{ top: (h - GRID_START) * SLOT_H }}>
                {h}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map((_, dayIdx) => {
            const d = weekDates[dayIdx]
            const isToday = d.toDateString() === today.toDateString()
            const dayApts = visibleApts.filter(a => a.day === dayIdx)

            return (
              <div key={dayIdx} className={`${styles.dayCol} ${isToday ? styles.todayCol : ''}`}>
                {/* Hour grid lines */}
                {HOURS.map(h => (
                  <div key={h} className={styles.hourLine} style={{ top: (h - GRID_START) * SLOT_H }} />
                ))}

                {/* Appointments */}
                {dayApts.map(apt => {
                  const staff = STAFF.find(s => s.id === apt.staffId)!
                  const top = (apt.startHour - GRID_START) * SLOT_H
                  const height = apt.dur * SLOT_H - 4

                  return (
                    <div
                      key={apt.id}
                      className={styles.aptBlock}
                      style={{
                        top,
                        height,
                        borderLeft: `3px solid ${staff.color}`,
                        background: `${staff.color}14`,
                      }}
                    >
                      <div className={styles.aptClient} style={{ color: staff.color }}>{apt.client}</div>
                      <div className={styles.aptService}>{apt.service}</div>
                      <div className={styles.aptStaff}>{staff.name}</div>
                    </div>
                  )
                })}

                {/* Current time indicator */}
                {isToday && (() => {
                  const now = new Date()
                  const h = now.getHours() + now.getMinutes() / 60
                  if (h < GRID_START || h > GRID_START + GRID_HOURS) return null
                  return (
                    <div className={styles.nowLine} style={{ top: (h - GRID_START) * SLOT_H }}>
                      <div className={styles.nowDot} />
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
