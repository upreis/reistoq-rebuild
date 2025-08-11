// Date helpers per provider (do not reuse between providers)
// Tiny: always returns DD/MM/YYYY
export function toTinyDate(input?: string | Date): string {
  if (!input) return '';
  if (input instanceof Date) {
    const dd = String(input.getDate()).padStart(2, '0');
    const mm = String(input.getMonth() + 1).padStart(2, '0');
    const yyyy = input.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  const s = String(input).trim();
  if (!s) return '';
  // Normalize separators
  const norm = s.replace(/\./g, '/').replace(/-/g, '/');
  // If already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(norm)) return norm;
  // If YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(norm)) {
    const [yyyy, mm, dd] = norm.split('/');
    return `${dd}/${mm}/${yyyy}`;
  }
  // Fallback: try Date parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) return toTinyDate(d);
  return s;
}

// Mercado Livre: always returns YYYY-MM-DD (ISO date without time)
export function toMLDateISO(input?: string | Date): string {
  if (!input) return '';
  if (input instanceof Date) {
    const yyyy = input.getFullYear();
    const mm = String(input.getMonth() + 1).padStart(2, '0');
    const dd = String(input.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const s = String(input).trim();
  if (!s) return '';
  // Normalize separators
  const norm = s.replace(/\./g, '/').replace(/-/g, '/');
  // If DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(norm)) {
    const [dd, mm, yyyy] = norm.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  // If already YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(norm)) {
    const [yyyy, mm, dd] = norm.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  // If already ISO YYYY-MM-DD, keep
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Fallback: try Date parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) return toMLDateISO(d);
  return s;
}
