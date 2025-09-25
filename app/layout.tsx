import type React from 'react'
import type { Metadata } from 'next'

import './globals.css'
import { AuthProvider } from '@/components/auth-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/error-boundary'
import { ConnectionStatus } from '@/components/connection-status'

export const metadata: Metadata = {
  title: 'Synced Sports - Sports Management System',
  description: 'Modern sports league and referee management platform',
  generator: 'v0.dev',
  manifest: '/site.webmanifest',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/synced-sports-icon.svg',
    other: [
      {
        rel: 'mask-icon',
        url: '/synced-sports-icon.svg',
        color: '#0B66FF'
      }
    ]
  },
  themeColor: '#0B66FF',
  openGraph: {
    title: 'Synced Sports',
    description: 'Modern sports league and referee management platform',
    images: ['/og-image.svg'],
    type: 'website'
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className='font-inter' suppressHydrationWarning={true}>
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
              <ConnectionStatus />
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
