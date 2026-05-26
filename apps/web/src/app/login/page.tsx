'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await authApi.login(email, password)
      } else {
        await authApi.register(name, email, password)
      }
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.left}>
        <div className={styles.brand}>
          <span className={styles.logo}>◆</span>
          <span className={styles.logoText}>SalonOS</span>
        </div>
        <div className={styles.tagline}>
          <h1>Управление<br /><em>без лишнего.</em></h1>
          <p>Запись, мастера, клиенты — всё в одном месте. В разы дешевле конкурентов.</p>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}><span>14</span><small>дней бесплатно</small></div>
          <div className={styles.stat}><span>∞</span><small>клиентов</small></div>
          <div className={styles.stat}><span>24/7</span><small>поддержка</small></div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.card}>
          <div className={styles.tabs}>
            <button type="button" className={mode === 'login' ? styles.activeTab : styles.tab} onClick={() => setMode('login')}>Войти</button>
            <button type="button" className={mode === 'register' ? styles.activeTab : styles.tab} onClick={() => setMode('register')}>Регистрация</button>
          </div>

          <form onSubmit={submit} className={styles.form}>
            {mode === 'register' && (
              <div className={`${styles.field} fade-up`}>
                <label>Имя</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Название салона или ваше имя" required />
              </div>
            )}
            <div className={`${styles.field} fade-up delay-1`}>
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className={`${styles.field} fade-up delay-2`}>
              <label>Пароль</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : mode === 'login' ? 'Войти' : 'Начать бесплатно →'}
            </button>
          </form>

          {mode === 'register' && (
            <p className={styles.hint}>14 дней бесплатно, карта не нужна</p>
          )}
        </div>
      </div>
    </div>
  )
}
