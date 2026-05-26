'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useServices, createService, updateService, deleteService } from '@/lib/hooks'
import styles from './services.module.css'

const CATEGORY_COLORS: Record<string, string> = {
  'Волосы': '#7aabdc', 'Ногти': '#6bbf8e', 'Брови': '#d4a96a',
  'Лицо':   '#c47ab5', 'Другое': '#a09d98',
}
function catColor(c: string) { return CATEGORY_COLORS[c] ?? '#a09d98' }

export default function ServicesPage() {
  const { salon } = useAuth()
  const { data: services, loading, reload } = useServices(salon?.id ?? null)
  const list = services ?? []

  const [activeCategory, setActiveCategory] = useState<string|null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]     = useState<string|null>(null)
  const [saving, setSaving]     = useState(false)

  const [fname, setFname]   = useState('')
  const [fcat, setFcat]     = useState('')
  const [fdur, setFdur]     = useState('60')
  const [fprice, setFprice] = useState('')

  const categories = Array.from(new Set(list.map((s:any) => s.category).filter(Boolean))) as string[]
  const visible    = list.filter((s:any) => activeCategory ? s.category === activeCategory : true)

  const openNew = () => {
    setFname(''); setFcat(categories[0] ?? ''); setFdur('60'); setFprice('')
    setEditId(null); setShowForm(true)
  }
  const openEdit = (s: any) => {
    setFname(s.name); setFcat(s.category ?? ''); setFdur(String(s.durationMin)); setFprice(String(s.price))
    setEditId(s.id); setShowForm(true)
  }

  const save = async () => {
    if (!salon) return
    setSaving(true)
    try {
      const body = { name: fname, category: fcat, durationMin: Number(fdur), price: Number(fprice) }
      if (editId) await updateService(salon.id, editId, body)
      else        await createService(salon.id, body)
      await reload()
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (s: any) => {
    if (!salon) return
    await updateService(salon.id, s.id, { isActive: !s.isActive })
    reload()
  }

  const remove = async (s: any) => {
    if (!salon || !confirm(`Удалить «${s.name}»?`)) return
    await deleteService(salon.id, s.id)
    reload()
  }

  return (
    <div>
      <div className={`${styles.header} fade-up`}>
        <div>
          <h1 className={styles.title}>Услуги</h1>
          <p className={styles.sub}>{list.filter((s:any)=>s.isActive).length} активных</p>
        </div>
        <button className={styles.newBtn} onClick={openNew}>+ Добавить услугу</button>
      </div>

      <div className={`${styles.stats} fade-up delay-1`}>
        {categories.map(cat => (
          <div
            key={cat}
            className={`${styles.statCard} ${activeCategory===cat ? styles.statActive : ''}`}
            onClick={() => setActiveCategory(activeCategory===cat ? null : cat)}
            style={activeCategory===cat ? { borderColor: catColor(cat), background: catColor(cat)+'0f' } : {}}
          >
            <div className={styles.statDot} style={{ background: catColor(cat) }} />
            <div className={styles.statName}>{cat}</div>
            <div className={styles.statCount}>{list.filter((s:any)=>s.category===cat&&s.isActive).length} усл.</div>
          </div>
        ))}
      </div>

      {loading && <div className={styles.loader}>Загрузка...</div>}

      {!loading && (
        <div className="fade-up delay-2">
          <div className={styles.tableHead}>
            <span>Услуга</span><span>Категория</span><span>Длительность</span><span>Цена</span><span>Статус</span><span></span>
          </div>
          {visible.map((s: any, i: number) => (
            <div key={s.id} className={`${styles.row} fade-up`} style={{ animationDelay: `${i*0.03}s` }}>
              <div className={styles.svcName}>
                <div className={styles.svcDot} style={{ background: catColor(s.category) }} />
                {s.name}
              </div>
              <span className={styles.catBadge} style={{ background: catColor(s.category)+'18', color: catColor(s.category) }}>{s.category}</span>
              <span className={styles.duration}>{s.durationMin} мин</span>
              <span className={styles.price}>{Number(s.price).toLocaleString('ru')} ₽</span>
              <span className={`${styles.status} ${s.isActive ? styles.statusOn : styles.statusOff}`}>
                {s.isActive ? 'Активна' : 'Скрыта'}
              </span>
              <div className={styles.actions}>
                <button className={styles.actionBtn} title="Редактировать" onClick={() => openEdit(s)}>✎</button>
                <button className={styles.actionBtn} title={s.isActive?'Скрыть':'Показать'} onClick={() => toggleActive(s)}>
                  {s.isActive ? '○' : '●'}
                </button>
                <button className={styles.actionBtn} title="Удалить" onClick={() => remove(s)} style={{color:'var(--red)'}}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className={styles.overlay} onClick={e => e.target===e.currentTarget && setShowForm(false)}>
          <div className={`${styles.modal} fade-up`}>
            <div className={styles.modalHead}>
              <h2 className={styles.modalTitle}>{editId ? 'Редактировать услугу' : 'Новая услуга'}</h2>
              <button className={styles.modalClose} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className={styles.modalFields}>
              <div className={styles.field}>
                <label>Название</label>
                <input value={fname} onChange={e=>setFname(e.target.value)} placeholder="Стрижка" autoFocus />
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>Категория</label>
                  <input value={fcat} onChange={e=>setFcat(e.target.value)} placeholder="Волосы" list="cats" />
                  <datalist id="cats">{categories.map(c=><option key={c} value={c}/>)}</datalist>
                </div>
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>Длительность (мин)</label>
                  <input type="number" value={fdur} onChange={e=>setFdur(e.target.value)} min="5" step="5" />
                </div>
                <div className={styles.field}>
                  <label>Цена (₽)</label>
                  <input type="number" value={fprice} onChange={e=>setFprice(e.target.value)} placeholder="2000" min="0" />
                </div>
              </div>
            </div>
            <div className={styles.modalFoot}>
              <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>Отмена</button>
              <button className={styles.saveBtn} onClick={save} disabled={!fname||!fcat||!fprice||saving}>
                {saving ? '...' : editId ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
