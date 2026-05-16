import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pulse — Business Dashboard',
  description: 'AI voice concierge with persistent customer memory',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} bg-[#0F0F0F] text-white min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
