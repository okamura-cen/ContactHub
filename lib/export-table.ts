/** 送信データ等の表形式データを CSV / Excel(.xlsx) / JSON でダウンロードする共通処理。
 *  Excel 生成に使う exceljs は呼び出し時のみ動的 import し、初期表示を軽量に保つ。 */

export type ExportFormat = 'csv' | 'xlsx' | 'json'

/** Blob をファイルとしてダウンロードさせる */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** ヘッダー行と文字列の2次元配列をもとに、指定形式でダウンロードする。
 *  ファイル名は `${filenameBase}_YYYY-MM-DD.<ext>`。 */
export async function downloadTable(
  format: ExportFormat,
  filenameBase: string,
  headers: string[],
  rows: string[][]
): Promise<void> {
  const dateStr = new Date().toISOString().slice(0, 10)
  const base = `${filenameBase}_${dateStr}`

  if (format === 'csv') {
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    // BOM 付き UTF-8（Excel で開いても文字化けしない）
    triggerDownload(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), `${base}.csv`)
    return
  }

  if (format === 'json') {
    const data = rows.map((row) =>
      Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
    )
    triggerDownload(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      `${base}.json`
    )
    return
  }

  // xlsx
  const { Workbook } = await import('exceljs')
  const wb = new Workbook()
  const ws = wb.addWorksheet('回答データ')
  const headerRow = ws.addRow(headers)
  headerRow.font = { bold: true }
  // すべて文字列として書き込み、電話番号などの先頭ゼロ落ち・指数表記化を防ぐ
  rows.forEach((row) => {
    const added = ws.addRow(row)
    added.eachCell((cell) => { cell.numFmt = '@' })
  })
  // 列幅をヘッダー・値の長さに合わせて簡易調整
  ws.columns.forEach((col, i) => {
    const cells = [String(headers[i] ?? ''), ...rows.map((r) => String(r[i] ?? ''))]
    const maxLen = cells.reduce((m, s) => Math.max(m, s.length), 0)
    col.width = Math.min(Math.max(maxLen + 2, 10), 60)
  })
  const buf = await wb.xlsx.writeBuffer()
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${base}.xlsx`
  )
}
