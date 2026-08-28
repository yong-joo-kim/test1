import { TicketRepository } from './ticket.repository';
import { assertValidTransition, calculateSlaDueAt } from './ticket.statemachine';
import {
  ChangeStatusInput,
  CreateTicketInput,
  Ticket,
  TicketSearchQuery,
} from './ticket.types';
import { EventPublisher } from '../../common/events';
import { ForbiddenError, NotFoundError } from '../../common/errors';

function generateTicketNo(seq: number, date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `AS-${y}${m}${d}-${String(seq).padStart(4, '0')}`;
}

export class TicketService {
  constructor(
    private repo: TicketRepository,
    private eventPublisher: EventPublisher,
  ) {}

  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    const id = await this.repo.nextSequence();
    const now = new Date();
    const slaDueAt = calculateSlaDueAt(input.priority, now);

    const ticket: Ticket = {
      id,
      ticketNo: generateTicketNo(id, now),
      customerId: input.customerId,
      productId: input.productId ?? null,
      title: input.title,
      description: input.description,
      channel: input.channel,
      priority: input.priority,
      status: 'RECEIVED',
      assignedEngineerId: null,
      createdBy: input.createdBy,
      slaDueAt: slaDueAt ? slaDueAt.toISOString() : null,
      completedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await this.repo.save(ticket);
    await this.repo.appendHistory({
      ticketId: ticket.id,
      fromStatus: null,
      toStatus: 'RECEIVED',
      changedBy: input.createdBy,
      reason: '신규 접수',
    });

    await this.eventPublisher.publish({
      type: 'ticket.created',
      payload: { ticketId: ticket.id, customerId: ticket.customerId, priority: ticket.priority },
    });

    return ticket;
  }

  async getTicketDetail(id: number) {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundError(`티켓 ${id}를 찾을 수 없습니다.`);
    const statusHistory = await this.repo.getHistory(id);
    return { ...ticket, statusHistory };
  }

  async search(query: TicketSearchQuery) {
    return this.repo.search(query);
  }

  async changeStatus(input: ChangeStatusInput): Promise<Ticket> {
    const ticket = await this.repo.findById(input.ticketId);
    if (!ticket) throw new NotFoundError(`티켓 ${input.ticketId}를 찾을 수 없습니다.`);

    // FR-7: 기사는 본인에게 배정된 티켓만 상태 변경 가능 (ADMIN 제외).
    // 단, 아직 담당자가 없는 티켓(RECEIVED -> ASSIGNED 최초 배정)은 예외적으로 허용한다.
    const isUnassigned = ticket.assignedEngineerId === null;
    if (input.actorRole === 'ENGINEER' && !isUnassigned && ticket.assignedEngineerId !== input.actorId) {
      throw new ForbiddenError('본인에게 배정된 티켓만 상태를 변경할 수 있습니다.');
    }

    const heldFromStatus =
      ticket.status === 'HOLD' ? await this.repo.findLastNonHoldStatus(ticket.id) : undefined;

    assertValidTransition(ticket.status, input.toStatus, { heldFromStatus });

    const now = new Date();
    const updated: Ticket = {
      ...ticket,
      status: input.toStatus,
      completedAt: input.toStatus === 'COMPLETED' ? now.toISOString() : ticket.completedAt,
      // ASSIGNED로 전이 시 담당 기사 지정 (본 스프린트는 actorId를 담당기사로 단순 배정, 실제 자동배정은 dispatch 도메인)
      assignedEngineerId:
        input.toStatus === 'ASSIGNED' ? input.actorId : ticket.assignedEngineerId,
      updatedAt: now.toISOString(),
    };

    await this.repo.save(updated);
    await this.repo.appendHistory({
      ticketId: ticket.id,
      fromStatus: ticket.status,
      toStatus: input.toStatus,
      changedBy: input.actorId,
      reason: input.reason,
    });

    await this.eventPublisher.publish({
      type: 'ticket.status_changed',
      payload: {
        ticketId: ticket.id,
        from: ticket.status,
        to: input.toStatus,
        changedBy: input.actorId,
      },
    });

    return updated;
  }
}
