import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

/** POST /api/forms/:formId/events - フォームイベントを記録 (公開エンドポイント) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params
    const { type, stepIndex, sessionId } = await req.json()

    if (!['VIEW', 'STEP_COMPLETE', 'SUBMIT'].includes(type)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400, headers: CORS_HEADERS })
    }

    await prisma.formEvent.create({
      data: {
        formId,
        type,
        stepIndex: stepIndex ?? null,
        sessionId: sessionId || 'anonymous',
      },
    })

    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
  } catch (error) {
    console.error('POST /api/forms/[formId]/events error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS })
}
