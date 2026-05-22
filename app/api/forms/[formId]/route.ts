import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { canDeleteForm, canEditForm } from '@/lib/access'

/** GET /api/forms/:formId - フォーム詳細を取得 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params

    // 公開フォーム取得（認証なし）と認証済みアクセスの両方を許可する従来の挙動を維持。
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        steps: {
          include: { fields: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
        _count: { select: { responses: true } },
      },
    })

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    return NextResponse.json(form)
  } catch (error) {
    console.error('GET /api/forms/[formId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PUT /api/forms/:formId - フォームを更新 (AGENCY/SUPER_ADMIN 所有 or CLIENT_EDITOR 担当) */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { formId } = await params
    const body = await req.json()
    const { title, description, status, settings, steps } = body

    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 編集権チェック (AGENCY/SUPER_ADMIN owner または CLIENT_EDITOR 担当)
    const edit = await canEditForm(user, formId)
    if (!edit.allowed) {
      return NextResponse.json({ error: '編集権限がありません' }, { status: 403 })
    }

    // ステップとフィールドの更新（トランザクション）
    const form = await prisma.$transaction(async (tx) => {
      // フォーム基本情報を更新
      await tx.form.update({
        where: { id: formId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(status !== undefined && { status }),
          ...(settings !== undefined && { settings }),
        },
      })

      // ステップの全置換
      if (steps) {
        // 既存のステップを削除（Cascade でフィールドも消える）
        await tx.step.deleteMany({ where: { formId } })

        // 新しいステップを作成
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i]
          await tx.step.create({
            data: {
              id: step.id,
              formId,
              order: i,
              title: step.title,
              fields: {
                create: (step.fields || []).map((f: Record<string, unknown>, j: number) => ({
                  id: f.id as string,
                  order: j,
                  type: (f.type as string).toUpperCase(),
                  label: f.label as string,
                  placeholder: (f.placeholder as string) || null,
                  helpText: (f.helpText as string) || null,
                  required: (f.required as boolean) || false,
                  options: f.options || null,
                  efoSettings: f.efoSettings || null,
                  logic: f.logic || null,
                  linkUrl: (f.linkUrl as string) || null,
                })),
              },
            },
          })
        }
      }

      return tx.form.findUnique({
        where: { id: formId },
        include: {
          steps: {
            include: { fields: { orderBy: { order: 'asc' } } },
            orderBy: { order: 'asc' },
          },
        },
      })
    })

    logAudit(req, user.id, { action: 'FORM_UPDATED', resource: 'form', resourceId: formId, detail: { status, title } })

    return NextResponse.json(form)
  } catch (error) {
    console.error('PUT /api/forms/[formId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/forms/:formId - フォームを削除 (AGENCY/SUPER_ADMIN owner のみ) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { formId } = await params
    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { id: true, userId: true, title: true },
    })
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    if (!canDeleteForm(user, form)) {
      return NextResponse.json({ error: 'フォーム削除権限がありません' }, { status: 403 })
    }

    await prisma.$transaction([
      prisma.response.deleteMany({ where: { formId } }),
      prisma.form.delete({ where: { id: formId } }),
    ])

    logAudit(_req, user.id, { action: 'FORM_DELETED', resource: 'form', resourceId: formId, detail: { title: form.title } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/forms/[formId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
