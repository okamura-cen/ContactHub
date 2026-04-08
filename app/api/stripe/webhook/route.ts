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
      // 決済成功 → ライセンスをACTIVEに
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
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
            stripePaymentId: session.subscription as string,
          },
        })

        console.log(`✅ License activated for form: ${formId}`)
        break
      }

      // サブスクリプション削除（解約・更新失敗） → 期限切れに
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const formId = sub.metadata?.formId

        // stripePaymentIdで対象フォームを検索
        const form = await prisma.form.findFirst({
          where: { stripePaymentId: sub.id },
        })
        if (!form && !formId) break

        await prisma.form.updateMany({
          where: { stripePaymentId: sub.id },
          data: {
            licenseStatus: 'EXPIRED',
            status: 'ARCHIVED', // 自動で非公開
          },
        })

        console.log(`⚠️ License expired, form archived: ${sub.id}`)
        break
      }

      // 支払い失敗
      case 'invoice.payment_failed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any
        const subId: string | undefined =
          invoice.subscription ?? invoice.parent?.subscription_details?.subscription

        if (!subId) break

        // 失敗は即時非公開にはしない（Stripeが自動でリトライするため）
        // ログのみ
        console.log(`💳 Payment failed for subscription: ${subId}`)
        break
      }

      // サブスクリプション更新成功 → 有効期限を1年延長
      case 'invoice.payment_succeeded': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any
        const subId: string | undefined =
          invoice.subscription ?? invoice.parent?.subscription_details?.subscription

        if (!subId) break

        // 初回決済はcheckout.session.completedで処理するため、2回目以降のみ
        const form = await prisma.form.findFirst({
          where: { stripePaymentId: subId },
        })
        if (!form || form.licenseStatus === 'PENDING') break

        const licenseExpiresAt = new Date()
        licenseExpiresAt.setFullYear(licenseExpiresAt.getFullYear() + 1)
        const dataDeleteAt = new Date(licenseExpiresAt)
        dataDeleteAt.setFullYear(dataDeleteAt.getFullYear() + 1)

        await prisma.form.update({
          where: { id: form.id },
          data: { licenseStatus: 'ACTIVE', licenseExpiresAt, dataDeleteAt },
        })

        console.log(`🔄 License renewed for form: ${form.id}`)
        break
      }
    }
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
