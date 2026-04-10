import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

/** GET /api/admin/audit - 監査ログ一覧（SUPER_ADMIN専用） */
export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const userId = searchParams.get('userId')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = 50

  const where: Record<string, unknown> = {}
  if (action) where.action = action
  if (userId) where.userId = userId

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  // ユーザー名を一括取得
  const userIds = Array.from(new Set(logs.map((l) => l.userId)))
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, role: true },
  })
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]))

  return NextResponse.json({
    logs: logs.map((l) => ({
      ...l,
      user: userMap[l.userId] || { email: l.userId, name: null, role: 'UNKNOWN' },
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}
