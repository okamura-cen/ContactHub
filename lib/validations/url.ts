/**
 * http:// または https:// で始まる絶対 URL かどうかを判定する。
 * javascript: / data: / file: などの危険なスキームを除外する用途。
 */
export function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
