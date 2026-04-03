import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { jaJP } from '@clerk/localizations'
import './globals.css'

export const metadata: Metadata = {
  title: 'ContactHub - EFOフォーム作成SaaS',
  description: 'EFO（入力フォーム最適化）に特化したWebフォーム作成サービス',
  icons: {
    icon: '/contacthub_logo.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider localization={jaJP}>
      <html lang="ja">
        <body className="min-h-screen antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}
