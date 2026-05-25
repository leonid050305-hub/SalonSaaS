'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useStaff, createStaff, updateStaff } from '@/lib/hooks'
import styles from './staff.module.css'

const DAYS     = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun']
const COLORS   = ['#d4a96a','#7aabdc','#6bbf8e','#c47ab5','#e07070','#6bb8bf']

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(p => p[0]).join('')
}

export default function StaffPage() {
  const { salon } = useAuth()
  const { data: staff, loading, reload } = useStaff(salon?.id ?? null)
  const list = staff ?? []

  const [selected, setSelected]   = useState<any>(null)
  const [showForm, setShowForm]   = useState(false)
  const [editMode, setEditMode]   = useState(false)
  const [filter, setFilter]       = useState<'all'|'active'|'inactive'>('all')
  const [saving, setSaving]       = useState(false)

  const [fname, setFname]     = useState('')
  const [frole, setFrole]     = useState('')
  const [fphone, setFphone]   = useState('')
  const [fsched, setFsched]   = useState<Record<string,any>>({})

  const visible = list.filter((s: any) =>
    filter === 'all' ? true : filter === 'active' ? s.isActive : !s.isActive
  )

  const openNew = () => {
    setFname(''); setFrole(''); setFphone('')
    setFsched({ mon:{start:'09:00',end:'18:00'}, tue:{start:'09:00',end:'18:00'}, wed:{start:'09:00',end:'18:00'}, thu:{start:'09:00',end:'18:00'}, fri:{start:'09:00',end:'18:00'}, sat:null, sun:null })
    setEditMode(false); setShowForm(true); setSelected(null)
  }
  const openEdit = (s: any) => {
    setFname(s.name); setFrole(s.role ?? ''); setFphone(s.phone ?? '')
    setFsched(s.schedule ?? {})
    setEditMode(true); setSelected(s); setShowForm(true)
  }

  const save = async () => {
    if (!salon) return
    setSaving(true)
    try {
      const body = { name: fname, role: frole, phone: fphone, schedule: fsched }
      if (editMode && selected) {
        await updateStaff(salon.id, selected.id, body)
      } else {
        await createStaff(salon.id, body)
      }
      await reload()
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (s: any) => {
    if (!salon) return
    await updateStaff(salon.id, s.id, { isActive: !s.isActive })
    reload()
    if (selected?.id === s.id) setSelected({ ...s, isActive: !s.isActive })
  }

  const toggleDay = (key: string) =>
    setFsched(p => ({ ...p, [key]: p[key] ? null : { start: '09:00', end: '18:00' } }))

  return (
    <div className={styles.root}>
      <div className={styles.left}>
        <div className={`${styles.header} fade-up`}>
          <div>
            <h1 className={styles.title}>Мастера</h1>
            <p className={styles.sub}>{list.filter((s:any)=>s.isActive).length} активных</p>
          </div>
          <button className={styles.newBtn} onClick={openNew}>+ Добавить</button>
        </div>

        <div className={`${styles.filters} fade-up delay-1`}>
          {(['all','active','inactive'] as const).map(f => (
            <button key={f} className={filter===f ? styles.filterActive : styles.filter} onClick={() => setFilter(f)}>
              {f==='all'?'Все':f==='active'?'Активные':'Неактивные'}
            </button>
          ))}
        </div>

        {loading && <div className={styles.loader}>Загрузка...</div>}

        <div className={`${styles.list} fade-up delay-2`}>
          {visible.map((s: any, i: number) => (
            <div
              key={s.id}
              className={`${styles.card} ${selected?.id === s.id ? styles.cardActive : ''}`}
              onClick={() => { setSelected(s); setShowForm(false) }}
            >
              <div className={styles.cardAvatar} style={{ background: COLORS[i%COLORS.length]+'22', color: COLORS[i%COLORS.length] }}>
                {initials(s.name)}
              </div>
              <div className={styles.cardInfo}>
                <div className={styles.cardName}>{s.name}</div>
                <div className={styles.cardRole}>{s.role}</div>
                <div className={styles.cardServices}>
                  {s.staffServices?.map((ss:any) => ss.service.name).join(', ')}
                </div>
              </div>
              <div className={styles.cardRight}>
                <div className={`${styles.statusDot} ${s.isActive ? styles.active : styles.inactive}`} />
                <div className={styles.cardDays}>
                  {DAY_KEYS.map((k,j) => (
                    <span key={k} className={`${styles.dayDot} ${s.schedule?.[k] ? styles.dayOn : ''}`} title={DAYS[j]} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.right}>
        {selected && !showForm && (
          <div className={`${styles.detail} fade-up`}>
            <div className={styles.detailHead}>
              <div className={styles.detailAvatar} style={{ background: COLORS[0]+'22', color: COLORS[0] }}>
                {initials(selected.name)}
              </div>
              <div>
                <div className={styles.detailName}>{selected.name}</div>
                <div className={styles.detailRole}>{selected.role}</div>
              </div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Телефон</div>
              <div className={styles.detailValue}>{selected.phone || '—'}</div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Услуги</div>
              <div className={styles.chips}>
                {selected.staffServices?.map((ss:any) => (
                  <span key={ss.service.name} className={styles.chip}>{ss.service.name}</span>
                ))}
              </div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Расписание</div>
              <div className={styles.scheduleGrid}>
                {DAY_KEYS.map((k, i) => {
                  const day = selected.schedule?.[k]
                  return (
                    <div key={k} className={`${styles.scheduleRow} ${!day ? styles.scheduleOff : ''}`}>
                      <span className={styles.scheduleDay}>{DAYS[i]}</span>
                      <span className={styles.scheduleTime}>{day ? `${day.start} – ${day.end}` : 'выходной'}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={styles.detailActions}>
              <button className={styles.editBtn} onClick={() => openEdit(selected)}>Редактировать</button>
              <button
                className={selected.isActive ? styles.deactivateBtn : styles.activateBtn}
                onClick={() => toggleActive(selected)}
              >
                {selected.isActive ? 'Деактивировать' : 'Активировать'}
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className={`${styles.form} fade-up`}>
            <div className={styles.formHead}>
              <h2 className={styles.formTitle}>{editMode ? 'Редактировать' : 'Новый мастер'}</h2>
              <button className={styles.formClose} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className={styles.formFields}>
              <div className={styles.field}>
                <label>Имя и фамилия</label>
                <input value={fname} onChange={e=>setFname(e.target.value)} placeholder="Мария Козлова" autoFocus />
              </div>
              <div className={styles.field}>
                <label>Должность</label>
                <input value={frole} onChange={e=>setFrole(e.target.value)} placeholder="Парикмахер" />
              </div>
              <div className={styles.field}>
                <label>Телефон</label>
                <input value={fphone} onChange={e=>setFphone(e.target.value)} placeholder="+7 900 000-00-00" />
              </div>
              <div className={styles.field}>
                <label>Рабочие дни</label>
                <div className={styles.daysToggle}>
                  {DAY_KEYS.map((k,i) => (
                    <button key={k} type="button"
                      className={`${styles.dayToggle} ${fsched[k] ? styles.dayToggleOn : ''}`}
                      onClick={() => toggleDay(k)}>
                      {DAYS[i]}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.field}>
                <label>Часы работы</label>
                <div className={styles.hoursGrid}>
                  {DAY_KEYS.map((k,i) => fsched[k] ? (
                    <div key={k} className={styles.hoursRow}>
                      <span className={styles.hoursDay}>{DAYS[i]}</span>
                      <input type="time" value={fsched[k].start} className={styles.timeInput}
                        onChange={e => setFsched(p=>({...p,[k]:{...p[k],start:e.target.value}}))} />
                      <span className={styles.hoursSep}>–</span>
                      <input type="time" value={fsched[k].end} className={styles.timeInput}
                        onChange={e => setFsched(p=>({...p,[k]:{...p[k],end:e.target.value}}))} />
                    </div>
                  ) : null)}
                </div>
              </div>
            </div>
            <div className={styles.formFoot}>
              <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>Отмена</button>
              <button className={styles.saveBtn} onClick={save} disabled={!fname || !frole || saving}>
                {saving ? '...' : editMode ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        )}

        {!selected && !showForm && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>◎</div>
            <p>Выберите мастера<br/>для просмотра деталей</p>
          </div>
        )}
      </div>
    </div>
  )
}
