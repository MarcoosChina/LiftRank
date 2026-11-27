import {
  computeWeeklySummary,
  findUnsavedWeekdays,
  planDiff,
  strToDate,
  todayStr,
} from './repo';

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

describe('planDiff', () => {
  it('não gera mudanças quando o rascunho é igual ao plano salvo', () => {
    const original = [
      { planId: 1, exercise_id: 10 },
      { planId: 2, exercise_id: 20 },
    ];

    expect(planDiff(original, original)).toEqual({
      removedPlanIds: [],
      addedExerciseIds: [],
    });
  });

  it('detecta remoções e adições novas', () => {
    const original = [
      { planId: 1, exercise_id: 10 },
      { planId: 2, exercise_id: 20 },
    ];
    const draft = [
      { planId: 1, exercise_id: 10 },
      { planId: null, exercise_id: 30 },
    ];

    expect(planDiff(original, draft)).toEqual({
      removedPlanIds: [2],
      addedExerciseIds: [30],
    });
  });

  it('remove e re-adiciona o mesmo exercício', () => {
    const original = [{ planId: 1, exercise_id: 10 }];
    const draft = [{ planId: null, exercise_id: 10 }];

    expect(planDiff(original, draft)).toEqual({
      removedPlanIds: [1],
      addedExerciseIds: [10],
    });
  });

  it('ignora itens novos repetidos no rascunho', () => {
    const draft = [
      { planId: null, exercise_id: 30 },
      { planId: null, exercise_id: 30 },
    ];

    expect(planDiff([], draft)).toEqual({
      removedPlanIds: [],
      addedExerciseIds: [30],
    });
  });
});

describe('findUnsavedWeekdays', () => {
  it('não acusa dias gravados corretamente, mesmo fora de ordem', () => {
    expect(
      findUnsavedWeekdays(
        [{ weekday: 1, exerciseIds: [10, 20] }],
        [{ weekday: 1, exerciseIds: [20, 10] }],
      ),
    ).toEqual([]);
  });

  it('acusa dia em que um exercício não foi gravado', () => {
    expect(
      findUnsavedWeekdays(
        [{ weekday: 1, exerciseIds: [10, 20] }],
        [{ weekday: 1, exerciseIds: [10] }],
      ),
    ).toEqual([1]);
  });

  it('acusa dia ausente na leitura de volta', () => {
    expect(findUnsavedWeekdays([{ weekday: 3, exerciseIds: [7] }], [])).toEqual([3]);
  });

  it('acusa exercício extra gravado no dia', () => {
    expect(
      findUnsavedWeekdays(
        [{ weekday: 0, exerciseIds: [5] }],
        [{ weekday: 0, exerciseIds: [5, 6] }],
      ),
    ).toEqual([0]);
  });

  it('ignora ids repetidos no estado esperado', () => {
    expect(
      findUnsavedWeekdays(
        [{ weekday: 2, exerciseIds: [1, 1, 2] }],
        [{ weekday: 2, exerciseIds: [1, 2] }],
      ),
    ).toEqual([]);
  });

  it('reporta apenas os dias divergentes', () => {
    expect(
      findUnsavedWeekdays(
        [
          { weekday: 1, exerciseIds: [1] },
          { weekday: 2, exerciseIds: [2] },
          { weekday: 3, exerciseIds: [3] },
        ],
        [
          { weekday: 1, exerciseIds: [1] },
          { weekday: 2, exerciseIds: [] },
          { weekday: 3, exerciseIds: [3, 4] },
        ],
      ),
    ).toEqual([2, 3]);
  });
});
