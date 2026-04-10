import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

interface AuditParams {
  action: string
  resource: string
  resourceId: string
  detail?: Record<string, unknown>
}

/** 監査ログを記録する。API ルート内で呼び出す。失敗してもリクエスト処理は止めない。 */
export async function logAudit(
  req: NextRequest,
  userId: string,
  params: AuditParams
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        detail: params.detail ? JSON.parse(JSON.stringify(params.detail)) : undefined,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null,
        userAgent: req.headers.get('user-agent') || null,
      },
    })
  } catch (e) {
    console.error('AuditLog write failed:', e)
  }
}
