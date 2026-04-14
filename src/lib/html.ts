/**
 * Minimal HTML entity escape for user-controlled strings that land inside
 * email templates or other HTML contexts. Emails receive values like
 * recipient_name, brand_name, tone, and lyric lines straight from the quiz —
 * any of which could contain `<`, `>`, or `&` and break the layout (or worse,
 * smuggle a link/script).
 *
 * We do NOT use this for attribute values; keep user data out of attribute
 * slots entirely in the email templates.
 */
export function htmlEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
