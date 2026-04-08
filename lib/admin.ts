import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/** 現在のユーザーがSUPER_ADMINかチェック。違う場合はnullを返す */
export async function requireSuperAdmin() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null

  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user || user.role !== 'SUPER_ADMIN') return null

  return user
}
