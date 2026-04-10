import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgency, agencyHasClient } from '@/lib/access'
import { logAudit } from '@/lib/audit'

/** GET /api/agency/forms?clientId=xxx - 代理店のフォーム一覧（クライアント絞り込み対応） */
export async function GET(req: NextRequest) {
  const agency = await requireAgency()
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')

  // clientId指定の場合は担当確認
  if (clientId) {
    const hasClient = await agencyHasClient(agency.id, clientId)
    if (!hasClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const forms = await prisma.form.findMany({
    where: {
      userId: agency.id,
      ...(clientId ? { clientId } : {}),
    },
    select: {
      id: true,
      title: true,
      status: true,
      licenseStatus: true,
      licenseExpiresAt: true,
      clientId: true,
      client: { select: { id: true, name: true, email: true } },
      createdAt: true,
      updatedAt: true,
      _count: { select: { responses: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(forms)
}

/** POST /api/agency/forms - フォーム新規作成 */
export async function POST(req: NextRequest) {
  const agency = await requireAgency()
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, clientId } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 })
  }

  // clientId指定の場合は担当確認
  if (clientId) {
    const hasClient = await agencyHasClient(agency.id, clientId)
    if (!hasClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // SUPER_ADMIN は購入不要で公開できるよう、最初からライセンスを ACTIVE・無期限にする
  const isSuperAdmin = agency.role === 'SUPER_ADMIN'

  const form = await prisma.form.create({
    data: {
      title,
      userId: agency.id,
      clientId: clientId || null,
      ...(isSuperAdmin && {
        licenseStatus: 'ACTIVE',
        licenseExpiresAt: null,
      }),
      settings: {
        successMessage: '送信が完了しました。ありがとうございます。',
        notifyEmails: [],
        autoReply: false,
      },
      steps: {
        create: { order: 0, title: 'ステップ 1' },
      },
    },
    include: { steps: { include: { fields: true } } },
  })

  logAudit(req, agency.id, { action: 'FORM_CREATED', resource: 'form', resourceId: form.id, detail: { title, clientId: clientId || null } })

  return NextResponse.json(form, { status: 201 })
}
