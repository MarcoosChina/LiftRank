import { todayStr, strToDate } from './repo';

describe('Repo utility functions', () => {
  it('should format date correctly to string YYYY-MM-DD', () => {
    const d = new Date(2026, 3, 15); // April 15, 2026
    expect(todayStr(d)).toBe('2026-04-15');
  });

  it('should parse YYYY-MM-DD string back to Date correctly', () => {
    const s = '2026-10-30';
    const d = strToDate(s);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9); // October is index 9
    expect(d.getDate()).toBe(30);
  });
});
