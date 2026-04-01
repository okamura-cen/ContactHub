import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/** GET /api/forms - ユーザーのフォーム一覧を取得 */
export async function GET() {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const forms = await prisma.form.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { responses: true } },
        steps: { include: { fields: true }, orderBy: { order: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(forms)
  } catch (error) {
    console.error('GET /api/forms error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/forms - 新規フォームを作成 */
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      // Clerkユーザーが未登録の場合は自動作成
      user = await prisma.user.create({
        data: {
          clerkId,
          email: '', // Clerkから取得すべきだが簡易化
        },
      })
    }

    const body = await req.json()
    const { title } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const form = await prisma.form.create({
      data: {
        title,
        userId: user.id,
        settings: {
          successMessage: '送信が完了しました。ありがとうございます。',
          notifyEmails: [],
          autoReply: false,
        },
        steps: {
          create: {
            order: 0,
            title: 'ステップ 1',
          },
        },
      },
      include: {
        steps: { include: { fields: true } },
      },
    })

    return NextResponse.json(form, { status: 201 })
  } catch (error) {
    console.error('POST /api/forms error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
