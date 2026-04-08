import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

/** Stripe Webhookの署名検証・イベント処理 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      // 決済完了 → ライセンスをACTIVEに（1年間）
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // payment モードのみ処理（subscription モードは使用しない）
        if (session.mode !== 'payment') break

        const formId = session.metadata?.formId
        if (!formId) break

        const licenseExpiresAt = new Date()
        licenseExpiresAt.setFullYear(licenseExpiresAt.getFullYear() + 1)

        // データ削除予定日 = 有効期限 + 1年
        const dataDeleteAt = new Date(licenseExpiresAt)
        dataDeleteAt.setFullYear(dataDeleteAt.getFullYear() + 1)

        await prisma.form.update({
          where: { id: formId },
          data: {
            licenseStatus: 'ACTIVE',
            licenseExpiresAt,
            dataDeleteAt,
            stripePaymentId: session.payment_intent as string,
          },
        })

        console.log(`✅ License activated for form: ${formId}`)
        break
      }
    }
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
