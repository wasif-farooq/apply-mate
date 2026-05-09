import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/auth'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'ApplyBuddy - AI Job Application Assistant',
  description: 'Automate your job applications with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}