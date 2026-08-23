'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'

interface NavItem {
  href: string
  label: string
}

interface NavigationProps {
  items: NavItem[]
  activeHref: string
}

export function Navigation({ items, activeHref }: NavigationProps) {
  const { signOut } = useAuth()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
      <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {items.map(item => (
          <Link 
            key={item.href} 
            href={item.href} 
            style={{ 
              color: item.href === activeHref ? '#00ed64' : '#a8b3bc', 
              textDecoration: 'none', 
              fontSize: '14px' 
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <button
        onClick={signOut}
        style={{
          background: 'transparent',
          border: '1px solid #ff6b6b',
          color: '#ff6b6b',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '14px',
          cursor: 'pointer',
          minWidth: 'auto',
          minHeight: 'auto',
        }}
      >
        <span className="hide-mobile">Sign Out</span>
        <span className="hide-desktop">✕</span>
      </button>
    </div>
  )
}
