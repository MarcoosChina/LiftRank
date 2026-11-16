import { computeWeeklySummary, strToDate, todayStr } from './repo';

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

describe('computeWeeklySummary', () => {
  it('usa os dias planejados como meta de consistência', () => {
    const summary = computeWeeklySummary({
      trainedDays: 3,
      plannedDays: 4,
      currentVolume: 0,
      previousVolume: 0,
    });

    expect(summary.workouts).toBe(3);
    expect(summary.consistency).toBe(75);
  });

  it('cai para meta de 7 dias quando não há plano', () => {
    const summary = computeWeeklySummary({
      trainedDays: 7,
      plannedDays: 0,
      currentVolume: 0,
      previousVolume: 0,
    });

    expect(summary.consistency).toBe(100);
  });

  it('nunca passa de 100% de consistência', () => {
    const summary = computeWeeklySummary({
      trainedDays: 5,
      plannedDays: 2,
      currentVolume: 0,
      previousVolume: 0,
    });

    expect(summary.consistency).toBe(100);
  });

  it('calcula a variação de força vs semana anterior', () => {
    const summary = computeWeeklySummary({
      trainedDays: 2,
      plannedDays: 3,
      currentVolume: 1180,
      previousVolume: 1000,
    });

    expect(summary.strengthDelta).toBe(18);
  });

  it('retorna null quando não há semana anterior para comparar', () => {
    const summary = computeWeeklySummary({
      trainedDays: 2,
      plannedDays: 3,
      currentVolume: 900,
      previousVolume: 0,
    });

    expect(summary.strengthDelta).toBeNull();
  });
});
