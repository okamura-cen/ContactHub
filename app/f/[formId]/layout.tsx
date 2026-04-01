import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'お問い合わせフォーム',
}

/** 公開フォーム用レイアウト（認証なし、最小限のOGタグ） */
export default function PublicFormLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
