import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { requireAgency } from '@/lib/access'
import { logAudit } from '@/lib/audit'
import { clientRoleSchema } from '@/lib/validations/role'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

/** GET /api/agency/clients - 担当クライアント一覧 */
export async function GET() {
  const agency = await requireAgency()
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const relations = await prisma.agencyClient.findMany({
    where: { agencyId: agency.id },
    include: {
      client: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: { select: { clientForms: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(relations)
}

/** POST /api/agency/clients - クライアント作成（メール+パスワード+ロール） */
export async function POST(req: NextRequest) {
  const agency = await requireAgency()
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, email, password, role: rawRole } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'メールアドレスとパスワードは必須です' }, { status: 400 })
  }

  // ロール検証 (CLIENT or CLIENT_EDITOR のみ、未指定なら CLIENT)
  const roleParsed = clientRoleSchema.optional().default('CLIENT').safeParse(rawRole)
  if (!roleParsed.success) {
    return NextResponse.json({ error: '不正な権限指定です' }, { status: 400 })
  }
  const role = roleParsed.data

  try {
    // Clerkでクライアントアカウント作成
    const clerk = await clerkClient()
    const clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      password,
      firstName: name || undefined,
    })

    // DBに指定ロールで作成
    const client = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email,
        name: name || null,
        role,
      },
    })

    // 代理店とクライアントを紐付け
    await prisma.agencyClient.create({
      data: { agencyId: agency.id, clientId: client.id },
    })

    // ログイン案内メール送信
    await resend.emails.send({
      from: 'ContactHub <noreply@contact-hub.app>',
      to: email,
      subject: 'ContactHub アカウントのご案内',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#333">ContactHub へようこそ</h2>
          <p>${name ? `${name} 様、` : ''}ContactHub のアカウントが作成されました。</p>
          <p>以下の情報でログインしてください。</p>
          <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>メールアドレス：</strong>${email}</p>
            <p style="margin:4px 0;"><strong>初期パスワード：</strong>${password}</p>
          </div>
          <p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/sign-in"
               style="display:inline-block;background:#c49a6c;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
              ログインする
            </a>
          </p>
          <p style="color:#999;font-size:12px;margin-top:24px;">
            ログイン後、パスワードは設定画面から変更できます。<br>
            ご不明な点はご担当者にお問い合わせください。
          </p>
        </div>
      `,
    })

    logAudit(req, agency.id, { action: 'CLIENT_CREATED', resource: 'client', resourceId: client.id, detail: { email, name: name || null, role } })

    return NextResponse.json({ client }, { status: 201 })
  } catch (error: unknown) {
    console.error('POST /api/agency/clients error:', error)
    const clerkError = error as { errors?: { message: string }[] }
    const message = clerkError?.errors?.[0]?.message || 'クライアントの作成に失敗しました'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
