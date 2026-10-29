// Amounts in cents, shown the German way: 4245 -> "42,45", 123456 -> "1.234,56". No HTML here.

const FORMAT = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const euro = (cents) => FORMAT.format(cents / 100);

// "42,45", "42.45", "1.234,56", "€ 12" -> cents; anything else -> NaN.
export function parseEuro(text) {
  let s = String(text || '').replace(/[\s€]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return NaN;
  return Math.round(parseFloat(s) * 100);
}
