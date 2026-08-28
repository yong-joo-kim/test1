import { TicketStatus } from './ticket.types';
import { BadRequestError } from '../../common/errors';

/**
 * REQ-TICKET-001 상태 전이 규칙
 * - RECEIVED -> ASSIGNED -> IN_PROGRESS -> COMPLETED (정상 흐름)
 * - RECEIVED/ASSIGNED/IN_PROGRESS -> CANCELLED (완료 이후에는 취소 불가)
 * - RECEIVED/ASSIGNED/IN_PROGRESS -> HOLD (보류)
 * - HOLD -> 보류 직전 상태로만 복귀 (resumeFrom 파라미터로 지정)
 */

const FORWARD_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  RECEIVED: ['ASSIGNED', 'CANCELLED', 'HOLD'],
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED', 'HOLD'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'HOLD'],
  COMPLETED: [],
  CANCELLED: [],
  HOLD: [], // HOLD 복귀는 별도 검증 (resumeFrom 필요)
};

const HOLDABLE_STATES: TicketStatus[] = ['RECEIVED', 'ASSIGNED', 'IN_PROGRESS'];

export interface TransitionContext {
  /** 현재 상태가 HOLD일 때, HOLD 진입 직전 상태 (이력에서 조회) */
  heldFromStatus?: TicketStatus | null;
}

/**
 * 상태 전이 가능 여부를 검증한다. 불가하면 BadRequestError를 던진다.
 */
export function assertValidTransition(
  current: TicketStatus,
  target: TicketStatus,
  ctx: TransitionContext = {},
): void {
  if (current === target) {
    throw new BadRequestError('INVALID_TRANSITION', '현재 상태와 동일한 상태로는 전이할 수 없습니다.');
  }

  if (current === 'HOLD') {
    // HOLD에서는 오직 보류 직전 상태로만 복귀 가능
    if (!ctx.heldFromStatus) {
      throw new BadRequestError('INVALID_TRANSITION', '보류 이전 상태 정보를 찾을 수 없어 복귀할 수 없습니다.');
    }
    if (target !== ctx.heldFromStatus) {
      throw new BadRequestError(
        'INVALID_TRANSITION',
        `보류 상태에서는 직전 상태(${ctx.heldFromStatus})로만 복귀할 수 있습니다.`,
      );
    }
    return;
  }

  if (target === 'HOLD' && !HOLDABLE_STATES.includes(current)) {
    throw new BadRequestError('INVALID_TRANSITION', `${current} 상태에서는 보류로 전이할 수 없습니다.`);
  }

  const allowed = FORWARD_TRANSITIONS[current];
  if (!allowed.includes(target)) {
    throw new BadRequestError(
      'INVALID_TRANSITION',
      `${current}에서 ${target}(으)로 전이할 수 없습니다. 허용된 전이: [${allowed.join(', ')}]`,
    );
  }
}

/** URGENT 우선순위 티켓의 SLA 기한을 계산한다 (FR-8) */
export function calculateSlaDueAt(priority: string, from: Date = new Date()): Date | null {
  if (priority === 'URGENT') {
    return new Date(from.getTime() + 4 * 60 * 60 * 1000);
  }
  return null;
}
