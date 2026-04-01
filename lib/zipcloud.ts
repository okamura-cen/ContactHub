interface ZipCloudResult {
  address1: string
  address2: string
  address3: string
  kana1: string
  kana2: string
  kana3: string
  prefcode: string
  zipcode: string
}

interface ZipCloudResponse {
  message: string | null
  results: ZipCloudResult[] | null
  status: number
}

/**
 * zipcloud APIで郵便番号から住所を検索する
 */
export async function searchAddress(zipcode: string): Promise<{
  prefecture: string
  city: string
  address: string
} | null> {
  const cleaned = zipcode.replace(/-/g, '')
  if (cleaned.length !== 7) return null

  const res = await fetch(
    `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`
  )
  const data: ZipCloudResponse = await res.json()

  if (!data.results || data.results.length === 0) return null

  const result = data.results[0]
  return {
    prefecture: result.address1,
    city: result.address2,
    address: result.address3,
  }
}
