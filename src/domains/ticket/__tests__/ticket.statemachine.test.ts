import { assertValidTransition, calculateSlaDueAt } from '../ticket.statemachine';
import { TicketStatus } from '../ticket.types';

const ALL_STATUSES: TicketStatus[] = [
  'RECEIVED',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'HOLD',
];

describe('REQ-TICKET-001 시나리오 1: 정상 접수 흐름', () => {
  it('RECEIVED -> ASSIGNED -> IN_PROGRESS -> COMPLETED 순서로 전이 가능하다', () => {
    expect(() => assertValidTransition('RECEIVED', 'ASSIGNED')).not.toThrow();
    expect(() => assertValidTransition('ASSIGNED', 'IN_PROGRESS')).not.toThrow();
    expect(() => assertValidTransition('IN_PROGRESS', 'COMPLETED')).not.toThrow();
  });
});

describe('REQ-TICKET-001 시나리오 2: 불법 상태 전이 차단', () => {
  it('COMPLETED에서 다른 상태로는 전이할 수 없다', () => {
    for (const target of ALL_STATUSES) {
      if (target === 'COMPLETED') continue;
      expect(() => assertValidTransition('COMPLETED', target)).toThrow(/전이할 수 없습니다|동일한 상태/);
    }
  });

  it('CANCELLED는 종결 상태로 어떤 상태로도 전이할 수 없다', () => {
    for (const target of ALL_STATUSES) {
      if (target === 'CANCELLED') continue;
      expect(() => assertValidTransition('CANCELLED', target)).toThrow();
    }
  });

  it('RECEIVED에서 바로 IN_PROGRESS/COMPLETED로 건너뛸 수 없다', () => {
    expect(() => assertValidTransition('RECEIVED', 'IN_PROGRESS')).toThrow();
    expect(() => assertValidTransition('RECEIVED', 'COMPLETED')).toThrow();
  });
});

describe('REQ-TICKET-001 시나리오 4: HOLD 진입/복귀', () => {
  it.each<TicketStatus>(['RECEIVED', 'ASSIGNED', 'IN_PROGRESS'])(
    '%s 상태에서는 HOLD로 전이할 수 있다',
    (from) => {
      expect(() => assertValidTransition(from, 'HOLD')).not.toThrow();
    },
  );

  it('COMPLETED/CANCELLED 상태에서는 HOLD로 전이할 수 없다', () => {
    expect(() => assertValidTransition('COMPLETED', 'HOLD')).toThrow();
    expect(() => assertValidTransition('CANCELLED', 'HOLD')).toThrow();
  });

  it('HOLD 상태는 보류 직전 상태로만 복귀할 수 있다', () => {
    expect(() =>
      assertValidTransition('HOLD', 'IN_PROGRESS', { heldFromStatus: 'IN_PROGRESS' }),
    ).not.toThrow();

    expect(() =>
      assertValidTransition('HOLD', 'RECEIVED', { heldFromStatus: 'IN_PROGRESS' }),
    ).toThrow(/직전 상태/);
  });

  it('보류 직전 상태 정보가 없으면 복귀할 수 없다', () => {
    expect(() => assertValidTransition('HOLD', 'IN_PROGRESS', {})).toThrow(/찾을 수 없어/);
  });
});

describe('전체 상태 조합 커버리지 (동일 상태 전이 금지)', () => {
  it.each(ALL_STATUSES)('%s -> %s (동일 상태)는 항상 에러', (status) => {
    expect(() => assertValidTransition(status, status)).toThrow(/동일한 상태/);
  });
});

describe('FR-8: URGENT 우선순위 SLA 자동 설정', () => {
  it('URGENT는 접수 시점 + 4시간을 SLA 기한으로 갖는다', () => {
    const base = new Date('2026-08-20T09:00:00Z');
    const due = calculateSlaDueAt('URGENT', base);
    expect(due?.toISOString()).toBe('2026-08-20T13:00:00.000Z');
  });

  it('URGENT가 아니면 SLA 기한이 없다', () => {
    expect(calculateSlaDueAt('NORMAL')).toBeNull();
  });
});
