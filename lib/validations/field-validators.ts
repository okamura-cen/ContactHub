import { z } from 'zod'
import { BuilderField } from '@/types/builder'
import { getRepeatableConfig } from '@/lib/repeatable'

/**
 * BuilderFieldの配列からZodスキーマを動的に構築する
 */
export function buildZodSchema(fields: BuilderField[]) {
  const shape: Record<string, z.ZodTypeAny> = {}

  fields.forEach((field) => {
    let schema: z.ZodTypeAny

    switch (field.type) {
      case 'email':
        schema = z.string().email('正しいメールアドレスを入力してください')
        break
      case 'tel':
        schema = z
          .string()
          .regex(
            /^0\d{1,4}-\d{1,4}-\d{4}$/,
            '正しい電話番号形式で入力してください'
          )
        break
      case 'zip':
        if (field.required) {
          schema = z.object({
            zipcode: z.string().regex(/^\d{3}-?\d{4}$/, '正しい郵便番号を入力してください'),
            prefecture: z.string().min(1, '都道府県を入力してください'),
            city: z.string().min(1, '市区町村を入力してください'),
            address: z.string().min(1, '番地を入力してください'),
          })
        } else {
          schema = z.object({
            zipcode: z.string(),
            prefecture: z.string(),
            city: z.string(),
            address: z.string(),
          }).optional()
        }
        shape[field.id] = schema
        return
      case 'agree':
        schema = z.literal(true, {
          errorMap: () => ({ message: '同意が必要です' }),
        })
        break
      case 'checkbox':
        schema = z.array(z.string()).min(0)
        break
      case 'name':
        if (field.required) {
          schema = z.object({
            sei: z.string().min(1, '姓を入力してください'),
            mei: z.string().min(1, '名を入力してください'),
            seiKana: z.string().min(1, 'セイを入力してください'),
            meiKana: z.string().min(1, 'メイを入力してください'),
          })
        } else {
          schema = z.object({
            sei: z.string(),
            mei: z.string(),
            seiKana: z.string(),
            meiKana: z.string(),
          }).optional()
        }
        shape[field.id] = schema
        return
      case 'file':
        if (field.required) {
          schema = z.object({
            url: z.string().min(1),
            name: z.string(),
            size: z.number(),
            type: z.string(),
          }, { required_error: `${field.label}を添付してください` })
        } else {
          schema = z.object({
            url: z.string(),
            name: z.string(),
            size: z.number(),
            type: z.string(),
          }).optional()
        }
        shape[field.id] = schema
        return
      case 'text':
      case 'date': {
        const { repeatable, maxItems } = getRepeatableConfig(field)
        if (repeatable) {
          // 各要素のスキーマ（日付は形式チェック、空要素は許容＝送信時に除去される）
          const elem =
            field.type === 'date'
              ? z
                  .string()
                  .refine(
                    (s) => s === '' || /^\d{4}-\d{2}-\d{2}$/.test(s),
                    '正しい日付を入力してください'
                  )
              : z.string()
          const arr = z.array(elem).max(maxItems, `最大${maxItems}個まで入力できます`).optional()
          if (field.required) {
            // 必須時は最低1つの非空入力を要求
            shape[field.id] = arr.refine(
              (a) => Array.isArray(a) && a.filter((s) => s.trim() !== '').length >= 1,
              `${field.label}を入力してください`
            )
          } else {
            shape[field.id] = arr
          }
          return
        }
        schema = z.string()
        break
      }
      case 'heading':
      case 'paragraph':
      case 'divider':
        return
      default:
        schema = z.string()
    }

    if (field.required) {
      if (schema instanceof z.ZodString) {
        schema = schema.min(1, `${field.label}を入力してください`)
      }
    } else {
      schema = schema.optional().or(z.literal(''))
    }

    shape[field.id] = schema
  })

  return z.object(shape)
}
