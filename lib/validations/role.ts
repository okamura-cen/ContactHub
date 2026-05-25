import { z } from 'zod'
import { UserRole } from '@prisma/client'

/** 代理店が指定可能なロール (CLIENT or CLIENT_EDITOR のみ)
 *  代理店経由での SUPER_ADMIN/AGENCY 作成・昇格を防ぐ。 */
export const clientRoleSchema = z.enum(['CLIENT', 'CLIENT_EDITOR'])
export type ClientRole = z.infer<typeof clientRoleSchema>

/** 管理者は全 enum 受付可 */
export const anyRoleSchema = z.nativeEnum(UserRole)
