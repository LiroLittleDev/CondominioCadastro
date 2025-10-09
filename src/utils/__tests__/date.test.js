import { parseDateLocal, formatDate } from '../../utils/date';

describe('date utils', () => {
  test('parseDateLocal returns Date for YYYY-MM-DD', () => {
    const dt = parseDateLocal('2025-10-08');
    expect(dt).toBeInstanceOf(Date);
    expect(dt.getFullYear()).toBe(2025);
    expect(dt.getMonth()).toBe(9); // Outubro = 9
    expect(dt.getDate()).toBe(8);
  });

  test('parseDateLocal returns null for invalid', () => {
    expect(parseDateLocal('not-a-date')).toBeNull();
    expect(parseDateLocal(null)).toBeNull();
  });

  test('formatDate returns localized string or -', () => {
    const s = formatDate('2025-10-08');
    // Expect Brazilian format dd/mm/yyyy
    expect(s).toMatch(/08\/?10\/?2025/);
    expect(formatDate(null)).toBe('-');
  });
});
