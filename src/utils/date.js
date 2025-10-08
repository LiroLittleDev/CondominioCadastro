// Utilities to parse and format simple date strings (YYYY-MM-DD) as local dates
export function parseDateLocal(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr === 'string') {
    const isoDateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateMatch) {
      const y = parseInt(isoDateMatch[1], 10);
      const m = parseInt(isoDateMatch[2], 10);
      const d = parseInt(isoDateMatch[3], 10);
      return new Date(y, m - 1, d);
    }
  }
  const dt = new Date(dateStr);
  if (isNaN(dt)) return null;
  return dt;
}

export function formatDate(dateStr) {
  const d = parseDateLocal(dateStr);
  return d ? d.toLocaleDateString('pt-BR') : '-';
}

const dateUtils = { parseDateLocal, formatDate };

export default dateUtils;
