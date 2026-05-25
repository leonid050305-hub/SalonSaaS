'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useClients, createClient } from '@/lib/hooks'
import styles from './clients.module.css'

export default function ClientsPage() {
  const { salon } = useAuth()
  const [search, setSearch]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [fname, setFname]     = useState('')
  const [fphone, setFphone]   = useState('')
  const [femail, setFemail]   = useState('')

  const { data, loading, reload } = useClients(salon?.id ?? null, search)
  const clients = data?.clients ?? []

  const save = async () => {
    if (!salon) return
    setSaving(true)
    try {
      await createClient(salon.id, { name: fname, phone: fphone, email: femail })
      await reload()
      setShowForm(false)
      setFname(''); setFphone(''); setFemail('')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div className={`${styles.header} fade-up`}>
        <div>
          <h1 className={styles.title}>Клиенты</h1>
          <p className={styles.sub}>{data?.total ?? 0} клиентов</p>
        </div>
        <button className={styles.newBtn} onClick={() => setShowForm(true)}>+ Добавить клиента</button>
      </div>

      <div className={`${styles.toolbar} fade-up delay-1`}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>◎</span>
          <input className={styles.search} placeholder="Поиск по имени или телефону..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading && <div style={{color:'var(--text3)',fontSize:14,padding:'24px 0'}}>Загрузка...</div>}

      {!loading && (
        <div className="fade-up delay-2">
          <div className={styles.tableHead}>
            <span>Клиент</span><span>Телефон</span><span>Визитов</span>
            <span>Последний визит</span><span>Сумма</span><span>Баллы</span><span></span>
          </div>
          {clients.map((c: any, i: number) => (
            <div key={c.id} className={`${styles.row} fade-up`} style={{ animationDelay: `${i*0.03}s` }}>
              <div className={styles.clientName}>
                <div className={styles.avatar}>{c.name[0]}</div>
                {c.name}
              </div>
              <span className={styles.phone}>{c.phone ?? '—'}</span>
              <span className={styles.visits}>—</span>
              <span className={styles.lastVisit}>
                {c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString('ru-RU', {day:'numeric',month:'short'}) : '—'}
              </span>
              <span className={styles.total}>—</span>
              <span className={styles.loyalty}>
                <span className={styles.loyaltyBadge}>{c.loyaltyPoints} б.</span>
              </span>
              <button className={styles.rowMenu}>···</button>
            </div>
          ))}
          {clients.length === 0 && (
            <div style={{color:'var(--text3)',fontSize:14,padding:'32px 0',textAlign:'center'}}>
              {search ? 'Никого не найдено' : 'Клиентов пока нет'}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}
          onClick={e => e.target===e.currentTarget && setShowForm(false)}>
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:420,overflow:'hidden'}} className="fade-up">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 24px 0'}}>
              <span style={{fontSize:16,fontWeight:600,color:'var(--text)'}}>Новый клиент</span>
              <button onClick={()=>setShowForm(false)} style={{color:'var(--text3)',fontSize:16,padding:'4px 8px',borderRadius:6}}>✕</button>
            </div>
            <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:14}}>
              {[['Имя',fname,setFname,'Анна Петрова',false],['Телефон',fphone,setFphone,'+7 900 000-00-00',false],['Email',femail,setFemail,'anna@example.com',false]].map(([label,val,set,ph]:any)=>(
                <div key={label} style={{display:'flex',flexDirection:'column',gap:6}}>
                  <label style={{fontSize:12,fontWeight:500,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.04em'}}>{label}</label>
                  <input value={val} onChange={e=>set(e.target.value)} placeholder={ph}
                    style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'10px 12px',color:'var(--text)',fontSize:14,outline:'none',fontFamily:'inherit'}} />
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8,padding:'0 24px 20px'}}>
              <button onClick={()=>setShowForm(false)} style={{flex:1,background:'none',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:10,fontSize:14,fontWeight:500,color:'var(--text3)'}}>Отмена</button>
              <button onClick={save} disabled={!fname||saving} style={{flex:2,background:'var(--accent)',border:'none',borderRadius:'var(--radius)',padding:10,fontSize:14,fontWeight:600,color:'#1a1200',opacity:(!fname||saving)?'.4':'1'}}>
                {saving?'...':'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
