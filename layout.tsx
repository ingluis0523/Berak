import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/layout/providers'

export const metadata: Metadata = {
  title: {
    default: 'Berak — IglesiaJCReina',
    template: '%s | Berak',
  },
  description: 'Plataforma de gestión integral para IglesiaJCReina',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
