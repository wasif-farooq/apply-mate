'use client'

import { useAuthGuard } from '@/hooks/useAuthGuard'

interface ProtectedRouteProps {
  children: React.ReactNode
  loadingFallback?: React.ReactNode
  unauthorizedFallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  loadingFallback = <LoadingFallback />,
  unauthorizedFallback = <UnauthorizedFallback />
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuthGuard()

  if (authLoading) {
    return <>{loadingFallback}</>
  }

  if (!user) {
    return <>{unauthorizedFallback}</>
  }

  return <>{children}</>
}

function LoadingFallback() {
  return (
    <div style={{ minHeight: '100vh', background: '#001e2b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <p>Loading...</p>
    </div>
  )
}

function UnauthorizedFallback() {
  return (
    <div style={{ minHeight: '100vh', background: '#001e2b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <p>Please sign in to access this page.</p>
    </div>
  )
}
