import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/cron/license
 * Vercel Cron（毎日実行）でライセンス期限切れ・データ削除を処理
 */
export async function GET(req: NextRequest) {
  // Vercel Cron からのリクエストのみ許可
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results = { expired: 0, deleted: 0 }

  // ① ライセンス期限切れ → EXPIRED + 自動非公開
  const expiredForms = await prisma.form.findMany({
    where: {
      licenseStatus: 'ACTIVE',
      licenseExpiresAt: { lt: now },
    },
    select: { id: true, title: true },
  })

  if (expiredForms.length > 0) {
    await prisma.form.updateMany({
      where: { id: { in: expiredForms.map((f) => f.id) } },
      data: {
        licenseStatus: 'EXPIRED',
        status: 'ARCHIVED',
      },
    })
    results.expired = expiredForms.length
    console.log(`⚠️ ${expiredForms.length}件のフォームをライセンス期限切れに設定:`, expiredForms.map((f) => f.title))
  }

  // ② データ削除期限超過 → レスポンス削除 + DELETED に更新
  const deletableForms = await prisma.form.findMany({
    where: {
      licenseStatus: 'EXPIRED',
      dataDeleteAt: { lt: now },
    },
    select: { id: true, title: true },
  })

  if (deletableForms.length > 0) {
    const ids = deletableForms.map((f) => f.id)

    await prisma.$transaction([
      // 送信データ削除
      prisma.response.deleteMany({ where: { formId: { in: ids } } }),
      // ライセンスをDELETEDに更新（フォーム自体は残す）
      prisma.form.updateMany({
        where: { id: { in: ids } },
        data: { licenseStatus: 'DELETED' },
      }),
    ])

    results.deleted = deletableForms.length
    console.log(`🗑️ ${deletableForms.length}件のフォームのデータを削除:`, deletableForms.map((f) => f.title))
  }

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    ...results,
  })
}
