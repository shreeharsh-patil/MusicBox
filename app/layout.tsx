import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import ClientProtector from '@/components/client-protector'
import './globals.css'

export const metadata: Metadata = {
  title: 'Harmonia - High-Fidelity Music Streaming',
  description: 'Harmonia is a modern high-fidelity music streaming application with live trending charts and synchronized lyrics.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ClientProtector />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
