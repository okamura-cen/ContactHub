import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** POST /api/webhook/clerk - Clerkユーザー同期用Webhook */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body

    if (type === 'user.created' || type === 'user.updated') {
      const { id, email_addresses, first_name, last_name } = data
      const email = email_addresses?.[0]?.email_address || ''
      const name = [first_name, last_name].filter(Boolean).join(' ') || null

      await prisma.user.upsert({
        where: { clerkId: id },
        update: { email, name },
        create: { clerkId: id, email, name },
      })
    }

    if (type === 'user.deleted') {
      const { id } = data
      await prisma.user.deleteMany({ where: { clerkId: id } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Clerk webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
