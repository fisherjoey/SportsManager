import type React from 'react'
import type { Metadata } from 'next'

import './globals.css'
import { AuthProvider } from '@/components/auth-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/error-boundary'

export const metadata: Metadata = {
  title: 'SyncedSport - Sports Management System',
  description: 'Modern sports league and referee management platform',
  generator: 'v0.dev',
  icons: {
    icon: '/sportsync-icon.png',
    shortcut: '/favicon.ico',
    apple: '/sportsync-icon.png'
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className='font-roboto' suppressHydrationWarning={true}>
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
