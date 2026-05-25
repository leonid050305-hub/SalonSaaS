'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import styles from './Sidebar.module.css'

const nav = [
  { href: '/dashboard',          icon: '◈', label: 'Дашборд'   },
  { href: '/dashboard/calendar', icon: '◷', label: 'Календарь' },
  { href: '/dashboard/clients',  icon: '◉', label: 'Клиенты'   },
  { href: '/dashboard/staff',    icon: '◎', label: 'Мастера'   },
  { href: '/dashboard/services', icon: '◇', label: 'Услуги'    },
]

export function Sidebar() {
  const path = usePathname()
  const { user, salon, logout } = useAuth()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.logo}>◆</span>
        <span className={styles.name}>SalonOS</span>
      </div>

      {salon && (
        <div className={styles.salonName}>{salon.name}</div>
      )}

      <nav className={styles.nav}>
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={path === item.href ? styles.activeLink : styles.link}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.bottom}>
        {user && (
          <div className={styles.userRow}>
            <div className={styles.userAvatar}>{user.name[0]}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user.name}</div>
              <div className={styles.userEmail}>{user.email}</div>
            </div>
          </div>
        )}
        <button className={styles.logoutBtn} onClick={logout}>Выйти</button>
      </div>
    </aside>
  )
}
