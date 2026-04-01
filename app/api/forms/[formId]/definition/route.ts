import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** GET /api/forms/:formId/definition - 公開フォームの定義JSONを返す（埋め込み用） */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params

    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        steps: {
          include: { fields: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!form || form.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    const definition = {
      id: form.id,
      title: form.title,
      settings: form.settings,
      steps: form.steps.map((s) => ({
        id: s.id,
        title: s.title,
        fields: s.fields.map((f) => ({
          id: f.id,
          type: f.type.toLowerCase(),
          label: f.label,
          placeholder: f.placeholder,
          helpText: f.helpText,
          required: f.required,
          options: f.options,
          efoSettings: f.efoSettings,
        })),
      })),
    }

    // CORSヘッダーを付与（外部サイトからの取得を許可）
    return NextResponse.json(definition, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch (error) {
    console.error('GET /api/forms/[formId]/definition error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
