import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canPurchaseLicense } from '@/lib/access'
import { createCheckoutSession } from '@/lib/stripe'

/**
 * POST /api/stripe/checkout
 * フォームライセンス購入のCheckoutセッションを作成
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { formId } = await req.json()
  if (!formId) return NextResponse.json({ error: 'formId is required' }, { status: 400 })

  const form = await prisma.form.findUnique({
    where: { id: formId },
  })
  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // ライセンス購入権 (AGENCY/SUPER_ADMIN ∧ owner のみ)
  if (!canPurchaseLicense(user, form)) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  // すでにACTIVEなライセンスがある場合はスキップ
  if (form.licenseStatus === 'ACTIVE') {
    return NextResponse.json({ error: 'このフォームはすでに有効なライセンスがあります' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://contact-hub.app'

  const session = await createCheckoutSession({
    formId,
    formTitle: form.title,
    agencyEmail: user.email,
    successUrl: `${appUrl}/forms?license=success&formId=${formId}`,
    cancelUrl:  `${appUrl}/forms?license=cancel`,
  })

  return NextResponse.json({ url: session.url })
}
