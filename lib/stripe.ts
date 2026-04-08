import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
})

/** フォームライセンス1本の価格（年間・円） */
export const FORM_LICENSE_PRICE_JPY = 10000

/** Stripe Checkout セッションを作成（年間一括払い） */
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
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: agencyEmail,
    line_items: [
      {
        price_data: {
          currency: 'jpy',
          product_data: {
            name: 'ContactHub フォームライセンス（1年間）',
            description: `フォーム: ${formTitle}`,
            metadata: { formId },
          },
          unit_amount: FORM_LICENSE_PRICE_JPY,
        },
        quantity: 1,
      },
    ],
    metadata: { formId },
    success_url: successUrl,
    cancel_url: cancelUrl,
    locale: 'ja',
  })

  return session
}
