import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

/** PATCH /api/admin/help/:id - ヘルプ記事を更新 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requireSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { title, content, category, audience, order, published } = body

  const article = await prisma.helpArticle.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(category !== undefined && { category }),
      ...(audience !== undefined && { audience }),
      ...(order !== undefined && { order }),
      ...(published !== undefined && { published }),
    },
  })

  return NextResponse.json(article)
}

/** DELETE /api/admin/help/:id - ヘルプ記事を削除 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await requireSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.helpArticle.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
