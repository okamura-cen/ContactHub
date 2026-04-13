import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

/** GET /api/admin/help - 全ヘルプ記事一覧（SUPER_ADMIN専用） */
export async function GET() {
  const admin = await requireSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const articles = await prisma.helpArticle.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(articles)
}

/** POST /api/admin/help - ヘルプ記事を新規作成 */
export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, content, category, audience, order, published } = body

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'タイトルと本文は必須です' }, { status: 400 })
  }

  const article = await prisma.helpArticle.create({
    data: {
      title,
      content,
      category: category || 'その他',
      audience: audience || 'common',
      order: order ?? 0,
      published: published !== false,
    },
  })

  return NextResponse.json(article, { status: 201 })
}
