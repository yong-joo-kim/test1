import { Ticket, TicketStatus, TicketStatusHistoryEntry, TicketSearchQuery } from './ticket.types';

/**
 * 리포지토리 인터페이스. 실제 배포에서는 Prisma/TypeORM 구현체로 교체하되
 * 이 인터페이스 시그니처는 유지한다 (service.ts가 이 계약에만 의존).
 */
export interface TicketRepository {
  nextSequence(): Promise<number>;
  save(ticket: Ticket): Promise<Ticket>;
  findById(id: number): Promise<Ticket | null>;
  search(query: TicketSearchQuery): Promise<{ content: Ticket[]; totalElements: number }>;
  appendHistory(entry: Omit<TicketStatusHistoryEntry, 'id' | 'changedAt'>): Promise<TicketStatusHistoryEntry>;
  getHistory(ticketId: number): Promise<TicketStatusHistoryEntry[]>;
  /** HOLD 진입 직전 상태를 이력에서 조회 (상태머신 검증용) */
  findLastNonHoldStatus(ticketId: number): Promise<TicketStatus | null>;
}

/** 테스트/데모용 인메모리 구현체. 프로덕션은 deploy-agent가 실 DB 어댑터로 교체. */
export class InMemoryTicketRepository implements TicketRepository {
  private tickets = new Map<number, Ticket>();
  private history: TicketStatusHistoryEntry[] = [];
  private seq = 0;
  private historySeq = 0;

  async nextSequence(): Promise<number> {
    this.seq += 1;
    return this.seq;
  }

  async save(ticket: Ticket): Promise<Ticket> {
    this.tickets.set(ticket.id, ticket);
    return ticket;
  }

  async findById(id: number): Promise<Ticket | null> {
    return this.tickets.get(id) ?? null;
  }

  async search(query: TicketSearchQuery) {
    let items = Array.from(this.tickets.values());

    if (query.status) items = items.filter((t) => t.status === query.status);
    if (query.engineerId) items = items.filter((t) => t.assignedEngineerId === query.engineerId);
    if (query.from) items = items.filter((t) => t.createdAt >= query.from!);
    if (query.to) items = items.filter((t) => t.createdAt <= query.to!);

    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const totalElements = items.length;
    const start = query.page * query.size;
    const content = items.slice(start, start + query.size);

    return { content, totalElements };
  }

  async appendHistory(entry: Omit<TicketStatusHistoryEntry, 'id' | 'changedAt'>) {
    this.historySeq += 1;
    const record: TicketStatusHistoryEntry = {
      ...entry,
      id: this.historySeq,
      changedAt: new Date().toISOString(),
    };
    this.history.push(record);
    return record;
  }

  async getHistory(ticketId: number): Promise<TicketStatusHistoryEntry[]> {
    return this.history
      .filter((h) => h.ticketId === ticketId)
      .sort((a, b) => (a.changedAt < b.changedAt ? -1 : 1));
  }

  async findLastNonHoldStatus(ticketId: number): Promise<TicketStatus | null> {
    const entries = await this.getHistory(ticketId);
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      if (entries[i].toStatus !== 'HOLD') return entries[i].toStatus;
    }
    return null;
  }
}
