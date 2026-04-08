import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
})

/** フォームライセンス1本の価格（年間・円） */
export const FORM_LICENSE_PRICE_JPY = 10000

/** Stripe Checkout セッションを作成（年間サブスクリプション） */
export async function createCheckoutSession({
  formId,
  formTitle,
  agencyEmail,
  successUrl,
  cancelUrl,
}: {
  formId: string
  formTitle: string
  agencyEmail: string
  successUrl: string
  cancelUrl: string
}) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: agencyEmail,
    line_items: [
      {
        price_data: {
          currency: 'jpy',
          product_data: {
            name: 'ContactHub フォームライセンス',
            description: `フォーム: ${formTitle}`,
            metadata: { formId },
          },
          unit_amount: FORM_LICENSE_PRICE_JPY,
          recurring: { interval: 'year' },
        },
        quantity: 1,
      },
    ],
    metadata: { formId },
    success_url: successUrl,
    cancel_url: cancelUrl,
    locale: 'ja',
    custom_text: {
      submit: {
        message: '※当商品は年毎の契約となります。月契約には対応しておりません。毎年自動更新されます。',
      },
    },
  })

  return session
}
