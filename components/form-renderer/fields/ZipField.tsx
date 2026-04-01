'use client'

import { useCallback, useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ZipValue {
  zipcode: string
  prefecture: string
  city: string
  address: string
}

interface ZipFieldProps {
  id: string
  label: string
  placeholder?: string
  helpText?: string
  required: boolean
  error?: string
  value: ZipValue
  onChange: (value: ZipValue) => void
  onBlur: () => void
}

/**
 * 郵便番号+住所入力フィールド（EFO対応）
 * - 7桁入力でzipcloud APIを自動呼出し
 * - 都道府県・市区町村・番地を自動セット
 * - ローディングスピナー表示
 */
export function ZipField({ id, label, placeholder, helpText, required, error, value, onChange, onBlur }: ZipFieldProps) {
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const valRef = useRef(value)
  valRef.current = value

  const val = value || { zipcode: '', prefecture: '', city: '', address: '' }

  const searchAddress = useCallback(async (zipcode: string) => {
    const cleaned = zipcode.replace(/[^0-9]/g, '')
    if (cleaned.length !== 7) return

    setLoading(true)
    setApiError(null)
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`)
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        const r = data.results[0]
        onChange({
          ...valRef.current,
          prefecture: r.address1,
          city: r.address2,
          address: r.address3,
        })
      } else {
        setApiError('該当する住所が見つかりませんでした')
      }
    } catch {
      setApiError('住所の検索に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [onChange])

  const handleZipcodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    v = v.replace(/[^\d-]/g, '')
    const digits = v.replace(/-/g, '')

    if (digits.length > 3) {
      v = `${digits.slice(0, 3)}-${digits.slice(3, 7)}`
    } else {
      v = digits
    }
    onChange({ ...val, zipcode: v })

    if (digits.length === 7) {
      searchAddress(digits)
    }
  }, [val, onChange, searchAddress])

  const zipDigits = (val.zipcode || '').replace(/-/g, '')
  const isZipValid = zipDigits.length === 7

  return (
    <div className="space-y-3">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-[hsl(var(--destructive))] ml-1">*</span>}
      </Label>

      {/* 郵便番号 */}
      <div>
        <Label htmlFor={`${id}-zip`} className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">郵便番号</Label>
        <div className="relative">
          <Input
            id={`${id}-zip`}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder={placeholder || '123-4567'}
            value={val.zipcode || ''}
            onChange={handleZipcodeChange}
            onBlur={onBlur}
            error={!!(error || apiError)}
            className="w-40"
            style={{ fontSize: '16px' }}
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="animate-spin h-4 w-4 text-[hsl(var(--muted-foreground))]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </span>
          )}
          {!loading && !error && !apiError && isZipValid && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">✓</span>
          )}
        </div>
      </div>

      {/* 都道府県 */}
      <div>
        <Label htmlFor={`${id}-pref`} className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">都道府県</Label>
        <Input
          id={`${id}-pref`}
          autoComplete="address-level1"
          placeholder="東京都"
          value={val.prefecture || ''}
          onChange={(e) => onChange({ ...val, prefecture: e.target.value })}
          onBlur={onBlur}
          error={!!error}
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* 市区町村 */}
      <div>
        <Label htmlFor={`${id}-city`} className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">市区町村</Label>
        <Input
          id={`${id}-city`}
          autoComplete="address-level2"
          placeholder="渋谷区"
          value={val.city || ''}
          onChange={(e) => onChange({ ...val, city: e.target.value })}
          onBlur={onBlur}
          error={!!error}
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* 番地・建物名 */}
      <div>
        <Label htmlFor={`${id}-addr`} className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">番地・建物名</Label>
        <Input
          id={`${id}-addr`}
          autoComplete="street-address"
          placeholder="1-2-3 サンプルビル101"
          value={val.address || ''}
          onChange={(e) => onChange({ ...val, address: e.target.value })}
          onBlur={onBlur}
          error={!!error}
          style={{ fontSize: '16px' }}
        />
      </div>

      {helpText && !error && !apiError && <p className="text-sm text-[hsl(var(--muted-foreground))]">{helpText}</p>}
      {(error || apiError) && <p className="text-sm text-[hsl(var(--destructive))]">{error || apiError}</p>}
    </div>
  )
}
