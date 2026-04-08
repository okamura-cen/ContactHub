import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/admin'
import { UserRole, Plan } from '@prisma/client'

/** GET /api/admin/users - 全ユーザー一覧 */
export async function GET() {
  const admin = await requireSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { forms: true } } },
  })

  return NextResponse.json(users)
}

/** POST /api/admin/users - ユーザー作成 */
export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, email, password, role, plan } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'メールアドレスとパスワードは必須です' }, { status: 400 })
  }

  try {
    // Clerkでユーザー作成
    const client = await clerkClient()
    const clerkUser = await client.users.createUser({
      emailAddress: [email],
      password,
      firstName: name || undefined,
      skipPasswordChecks: false,
    })

    // DBにユーザーレコード作成
    const user = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email,
        name: name || null,
        role: (role as UserRole) || 'CLIENT',
        plan: (plan as Plan) || 'STARTER',
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error: unknown) {
    console.error('POST /api/admin/users error:', error)
    const clerkError = error as { errors?: { message: string }[] }
    const message = clerkError?.errors?.[0]?.message || 'ユーザーの作成に失敗しました'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
