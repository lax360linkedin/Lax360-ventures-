/**
 * A branch's phone field holds one number or several separated by commas, slashes or new lines (for example "+91 95666 79928, +91 86676 30258").
 * Returns [{ display, tel }]: the number as written and the digits for a tap-to-call link.
 */
export function phoneList(value) {
  return String(value || '').split(/[,;/\n]+/).map((p) => p.trim()).filter(Boolean).map((display) => ({ display, tel: display.replace(/[^\d+]/g, '') })).filter((p) => p.tel.length >= 6)
}
