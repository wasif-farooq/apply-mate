'use client'

import Link from 'next/link'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { useApplications } from '@/hooks/useApplications'
import { Header } from '@applymate/ui'
import { useAuth } from '@/lib/auth'

function StatsGrid({ stats }: { stats: { total: number; sent: number; generated: number; failed: number } | null }) {
  if (!stats) return null

  const items = [
    { label: 'Total', value: stats.total, color: '#fff' },
    { label: 'Sent', value: stats.sent, color: '#00ed64' },
    { label: 'Generated', value: stats.generated, color: '#3b82f6' },
    { label: 'Failed', value: stats.failed, color: '#f59e0b' }
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      padding: '24px',
      maxWidth: '900px',
      margin: '0 auto'
    }}>
      {items.map((stat) => (
        <div key={stat.label} style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 600, color: stat.color }}>{stat.value}</div>
          <div style={{ fontSize: '14px', color: '#a8b3bc', marginTop: '4px' }}>{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

function FilterBar({ filter, onFilterChange }: { filter: string; onFilterChange: (f: string) => void }) {
  const filters = ['all', 'sent', 'generated', 'failed']
  
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 24px', display: 'flex', gap: '8px' }}>
      {filters.map((f) => (
        <button
          key={f}
          onClick={() => onFilterChange(f === 'all' ? '' : f)}
          style={{
            padding: '8px 16px',
            background: (f === 'all' && !filter) || filter === f ? '#00ed64' : 'transparent',
            color: (f === 'all' && !filter) || filter === f ? '#001e2b' : '#a8b3bc',
            border: '1px solid',
            borderColor: (f === 'all' && !filter) || filter === f ? '#00ed64' : '#1c2d38',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            textTransform: 'capitalize'
          }}
        >
          {f}
        </button>
      ))}
    </div>
  )
}

function ApplicationCard({ 
  app, 
  statusStyle, 
  formatDate, 
  onDelete 
}: { 
  app: { id: number; title: string | null; company: string | null; location: string | null; created_at: string; sent_to_email: string | null; linkedin_url: string; status: string };
  statusStyle: { bg: string; text: string };
  formatDate: (d: string) => string;
  onDelete: (id: number) => void;
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <span style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>
            {app.title || 'Unknown Title'}
          </span>
          <span style={{
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            background: statusStyle.bg,
            color: statusStyle.text
          }}>
            {app.status}
          </span>
        </div>
        <div style={{ fontSize: '14px', color: '#a8b3bc', marginBottom: '4px' }}>
          {app.company || 'Unknown Company'} {app.location && `• ${app.location}`}
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          {formatDate(app.created_at)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {app.sent_to_email && (
          <span style={{ fontSize: '13px', color: '#00ed64' }}>→ {app.sent_to_email}</span>
        )}
        <a
          href={app.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid #1c2d38',
            borderRadius: '6px',
            color: '#a8b3bc',
            fontSize: '14px',
            textDecoration: 'none'
          }}
        >
          View
        </a>
        <button
          onClick={() => onDelete(app.id)}
          style={{
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid #ff6b6b',
            borderRadius: '6px',
            color: '#ff6b6b',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function ErrorMessage({ error }: { error: string }) {
  return error ? (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto 24px',
      padding: '12px 16px',
      background: '#fff8e0',
      color: '#946f3f',
      borderRadius: '8px'
    }}>
      {error}
    </div>
  ) : null
}

function ApplicationList({ 
  applications, 
  loading, 
  getStatusColor, 
  formatDate, 
  onDelete 
}: { 
  applications: any[];
  loading: boolean;
  getStatusColor: (s: string) => { bg: string; text: string };
  formatDate: (d: string) => string;
  onDelete: (id: number) => void;
}) {
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '48px', color: '#a8b3bc' }}>Loading...</div>
  }

  if (applications.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#a8b3bc' }}>
        <p>No applications found.</p>
        <Link href="/apply" style={{ color: '#00ed64', textDecoration: 'none' }}>
          Start applying →
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {applications.map((app) => {
        const statusStyle = getStatusColor(app.status)
        return (
          <ApplicationCard
            key={app.id}
            app={app}
            statusStyle={statusStyle}
            formatDate={formatDate}
            onDelete={onDelete}
          />
        )
      })}
    </div>
  )
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuthGuard()
  const { signOut } = useAuth()
  
  const {
    applications,
    stats,
    loading,
    error,
    filter,
    setFilter,
    handleDelete,
    getStatusColor,
    formatDate,
  } = useApplications()

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#001e2b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#001e2b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <p>Please sign in to access this page.</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#001e2b', color: '#ffffff' }}>
      <Header 
        logo="ApplyMate"
        rightElement={
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/apply" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px' }}>Apply</Link>
            <Link href="/history" style={{ color: '#00ed64', textDecoration: 'none', fontSize: '14px' }}>History</Link>
            <Link href="/settings" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px' }}>Settings</Link>
            <button
              onClick={signOut}
              style={{
                background: 'transparent',
                border: '1px solid #ff6b6b',
                color: '#ff6b6b',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        }
      />

      <StatsGrid stats={stats} />

      <FilterBar filter={filter} onFilterChange={setFilter} />

      <ErrorMessage error={error} />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 48px' }}>
        <ApplicationList
          applications={applications}
          loading={loading}
          getStatusColor={getStatusColor}
          formatDate={formatDate}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}