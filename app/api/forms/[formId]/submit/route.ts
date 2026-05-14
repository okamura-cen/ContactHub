import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { expandAutoReplyTemplate } from '@/lib/email-template'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

/** POST /api/forms/:formId/submit - 公開フォームの送信処理 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params
    const body = await req.json()
    const { data, metadata, recaptchaToken } = body

    // フォームを取得
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        steps: {
          include: { fields: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    if (form.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'This form is archived' }, { status: 404 })
    }

    // reCAPTCHA v3 検証
    const settings = form.settings as Record<string, unknown> | null
    if (settings?.recaptchaEnabled && process.env.RECAPTCHA_SECRET_KEY) {
      if (!recaptchaToken) {
        return NextResponse.json({ error: 'reCAPTCHA verification required' }, { status: 400 })
      }
      try {
        const verifyRes = await fetch(
          `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
          { method: 'POST' }
        )
        const verifyData = await verifyRes.json() as { success: boolean; score?: number }
        if (!verifyData.success || (verifyData.score !== undefined && verifyData.score < 0.5)) {
          return NextResponse.json({ error: 'reCAPTCHA verification failed' }, { status: 400 })
        }
      } catch {
        // 検証失敗時は通過させる（可用性優先）
      }
    }

    // レスポンスを保存
    const response = await prisma.response.create({
      data: {
        formId,
        data,
        metadata: {
          ...metadata,
          ip: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
          submittedAt: new Date().toISOString(),
        },
      },
    })

    // 管理者通知メール送信
    if (resend && settings) {
      const notifyEmails = (settings.notifyEmails as string[]) || []
      if (notifyEmails.length > 0) {
        const allFields = form.steps.flatMap((s) => s.fields)
        const htmlRows = allFields
          .filter((f) => !['HEADING', 'DIVIDER'].includes(f.type))
          .map((f) => {
            const val = (data as Record<string, unknown>)[f.id] || '(未入力)'
            const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val)
            return `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${f.label}</td><td style="padding:8px;border:1px solid #ddd;">${displayVal}</td></tr>`
          })
          .join('')

        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: notifyEmails,
            subject: `【ContactHub】${form.title} に新しい送信がありました`,
            html: `
              <h2>${form.title} - 新規送信通知</h2>
              <table style="border-collapse:collapse;width:100%;">${htmlRows}</table>
              <p style="margin-top:16px;color:#666;">送信日時: ${new Date().toLocaleString('ja-JP')}</p>
            `,
          })
        } catch (emailError) {
          console.error('Admin notification email failed:', emailError)
        }
      }

      // 自動返信メール
      if (settings.autoReply) {
        const emailField = form.steps
          .flatMap((s) => s.fields)
          .find((f) => f.type === 'EMAIL')
        const recipientEmail = emailField ? (data as Record<string, string>)[emailField.id] : null

        if (recipientEmail) {
          // フォーム設定で上書き可能、未設定時は環境変数→デフォルトの順でフォールバック
          const fromEmail = (settings.autoReplyFromEmail as string) || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
          const fromName = (settings.autoReplyFromName as string) || ''
          const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail
          const replyTo = (settings.autoReplyReplyTo as string) || undefined
          const subject = (settings.autoReplySubject as string) || `【${form.title}】お問い合わせありがとうございます`

          // {{ラベル}} / {{全回答}} を回答内容で展開
          const rawTemplate = (settings.autoReplyMessage as string) ||
            '<p>お問い合わせいただきありがとうございます。</p><p>内容を確認の上、担当者よりご連絡いたします。</p>'
          const allFields = form.steps.flatMap((s) => s.fields)
          const expandedHtml = expandAutoReplyTemplate(rawTemplate, allFields, data as Record<string, unknown>)

          try {
            await resend.emails.send({
              from,
              to: recipientEmail,
              subject,
              ...(replyTo && { replyTo }),
              html: expandedHtml,
            })
          } catch (emailError) {
            console.error('Auto-reply email failed:', emailError)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      responseId: response.id,
      successMessage: (settings as Record<string, unknown>)?.successMessage || '送信が完了しました。',
      redirectUrl: (settings as Record<string, unknown>)?.redirectUrl || null,
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (error) {
    console.error('POST /api/forms/[formId]/submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** CORS preflight */
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
