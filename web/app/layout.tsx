import type React from "react"
import type { Metadata } from "next"
import { Inter, Geist_Mono, Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ViewTransitions } from "next-view-transitions"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" })

export const metadata: Metadata = {
  title: "hey, G! — AI voice concierge for small business",
  description:
    "What if every business could talk to every customer — simultaneously, in their language, remembering everything?",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ViewTransitions>
      <html lang="en">
        <body className={`${inter.variable} ${playfair.variable} ${geistMono.variable} font-sans antialiased`}>
          {children}
          <Analytics />
        </body>
      </html>
    </ViewTransitions>
  )
}
