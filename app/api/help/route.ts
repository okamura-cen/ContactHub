import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/** GET /api/help - ロールに応じたヘルプ記事を返す */
export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // ロールに応じて対象記事をフィルタ
  const audiences = user.role === 'CLIENT'
    ? ['client', 'common']
    : ['agency', 'common'] // AGENCY + SUPER_ADMIN

  const articles = await prisma.helpArticle.findMany({
    where: { published: true, audience: { in: audiences } },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(articles)
}
