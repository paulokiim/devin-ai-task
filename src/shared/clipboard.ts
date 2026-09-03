/**
 * Tiny browser helpers so every page can back its Copy / Export buttons with
 * real behaviour instead of placeholders. No app state, no React.
 */

/** Copies text and resolves `true` when the clipboard accepted it. */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // fall through to the textarea fallback below
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

const escapeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export interface CsvColumn<TRow> {
  header: string
  value: (row: TRow) => string | number | boolean | null | undefined
}

/** Builds an RFC-4180-ish CSV string from rows plus column definitions. */
export function toCsv<TRow>(rows: TRow[], columns: CsvColumn<TRow>[]): string {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(',')
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvCell(column.value(row))).join(','),
  )
  return [header, ...body].join('\n')
}

/** Triggers a client-side file download (used by table export buttons). */
export function downloadFile(
  filename: string,
  contents: string,
  mimeType = 'text/csv;charset=utf-8',
): void {
  const blob = new Blob([contents], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
