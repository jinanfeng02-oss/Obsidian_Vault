import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shadow Command Center',
  description: 'Shadow-Gateway 中央指挥面板',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" className="dark">
      <body className="bg-background text-text-primary antialiased">{children}</body>
    </html>
  )
}
