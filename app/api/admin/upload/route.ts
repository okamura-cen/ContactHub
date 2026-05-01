import { NextRequest, NextResponse } from 'next/server'
import { requireAgency } from '@/lib/access'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

/** POST /api/admin/upload - 管理用画像アップロード（AGENCY/SUPER_ADMIN専用） */
export async function POST(req: NextRequest) {
  const user = await requireAgency()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'ファイルサイズは5MB以下にしてください' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: '画像ファイル（JPG/PNG/GIF/WebP/SVG）のみ対応しています' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'ストレージが設定されていません' }, { status: 500 })

    const ext = file.name.split('.').pop() || 'png'
    const filename = `lp/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/form-uploads/${filename}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': file.type,
          'x-upsert': 'false',
        },
        body: file,
      }
    )

    if (!uploadRes.ok) {
      console.error('Supabase upload error:', await uploadRes.text())
      return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 })
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/form-uploads/${filename}`
    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error('POST /api/admin/upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
