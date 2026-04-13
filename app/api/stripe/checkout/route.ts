import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgency } from '@/lib/access'
import { createCheckoutSession } from '@/lib/stripe'

/**
 * POST /api/stripe/checkout
 * フォームライセンス購入のCheckoutセッションを作成
 */
export async function POST(req: NextRequest) {
  const agency = await requireAgency()
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { formId } = await req.json()
  if (!formId) return NextResponse.json({ error: 'formId is required' }, { status: 400 })

  // フォームが代理店のものか確認
  const form = await prisma.form.findFirst({
    where: { id: formId, userId: agency.id },
  })
  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // すでにACTIVEなライセンスがある場合はスキップ
  if (form.licenseStatus === 'ACTIVE') {
    return NextResponse.json({ error: 'このフォームはすでに有効なライセンスがあります' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://contact-hub.app'

  const session = await createCheckoutSession({
    formId,
    formTitle: form.title,
    agencyEmail: agency.email,
    successUrl: `${appUrl}/forms?license=success&formId=${formId}`,
    cancelUrl:  `${appUrl}/forms?license=cancel`,
  })

  return NextResponse.json({ url: session.url })
}
