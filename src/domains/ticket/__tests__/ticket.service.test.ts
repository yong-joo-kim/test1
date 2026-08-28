import { TicketService } from '../ticket.service';
import { InMemoryTicketRepository } from '../ticket.repository';
import { EventPublisher, DomainEvent } from '../../../common/events';
import { ForbiddenError, NotFoundError } from '../../../common/errors';

class FakeEventPublisher implements EventPublisher {
  events: DomainEvent[] = [];
  async publish(event: DomainEvent) {
    this.events.push(event);
  }
}

function buildService() {
  const repo = new InMemoryTicketRepository();
  const publisher = new FakeEventPublisher();
  const service = new TicketService(repo, publisher);
  return { repo, publisher, service };
}

describe('REQ-TICKET-001 시나리오 1: 정상 접수', () => {
  it('접수 시 RECEIVED 상태 티켓이 생성되고 ticket.created 이벤트가 발행된다', async () => {
    const { service, publisher } = buildService();

    const ticket = await service.createTicket({
      customerId: 10,
      title: '화면이 안 나와요',
      description: '전원은 켜지는데 화면 미출력',
      channel: 'PHONE',
      priority: 'HIGH',
      createdBy: 1,
    });

    expect(ticket.status).toBe('RECEIVED');
    expect(ticket.ticketNo).toMatch(/^AS-\d{8}-\d{4}$/);
    expect(publisher.events).toContainEqual(
      expect.objectContaining({ type: 'ticket.created' }),
    );
  });
});

describe('REQ-TICKET-001 시나리오 3: 기사 권한 제한 (FR-7)', () => {
  it('배정된 기사가 아닌 다른 기사가 상태 변경을 시도하면 403에 해당하는 ForbiddenError', async () => {
    const { service } = buildService();

    const ticket = await service.createTicket({
      customerId: 10,
      title: '냉장고 소음',
      description: '이상 소음 발생',
      channel: 'WEB',
      priority: 'NORMAL',
      createdBy: 1,
    });

    // 기사 A(id=100)에게 배정
    await service.changeStatus({
      ticketId: ticket.id,
      toStatus: 'ASSIGNED',
      reason: '기사 배정',
      actorId: 100,
      actorRole: 'ENGINEER',
    });

    // 기사 B(id=200)가 변경 시도 -> 거부
    await expect(
      service.changeStatus({
        ticketId: ticket.id,
        toStatus: 'IN_PROGRESS',
        reason: '작업 시작',
        actorId: 200,
        actorRole: 'ENGINEER',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('ADMIN은 배정 여부와 무관하게 상태 변경 가능하다', async () => {
    const { service } = buildService();
    const ticket = await service.createTicket({
      customerId: 10,
      title: '세탁기 고장',
      description: '탈수 안됨',
      channel: 'APP',
      priority: 'LOW',
      createdBy: 1,
    });

    await service.changeStatus({
      ticketId: ticket.id,
      toStatus: 'ASSIGNED',
      reason: '기사 배정',
      actorId: 100,
      actorRole: 'ENGINEER',
    });

    await expect(
      service.changeStatus({
        ticketId: ticket.id,
        toStatus: 'CANCELLED',
        reason: '고객 요청 취소',
        actorId: 999,
        actorRole: 'ADMIN',
      }),
    ).resolves.toMatchObject({ status: 'CANCELLED' });
  });
});

describe('이력 기록 (FR-5)', () => {
  it('모든 상태 변경은 이력에 남는다', async () => {
    const { service, repo } = buildService();
    const ticket = await service.createTicket({
      customerId: 10,
      title: 'TV 전원 불량',
      description: '전원 버튼 반응 없음',
      channel: 'EMAIL',
      priority: 'URGENT',
      createdBy: 1,
    });

    await service.changeStatus({
      ticketId: ticket.id,
      toStatus: 'ASSIGNED',
      reason: '배정',
      actorId: 100,
      actorRole: 'ENGINEER',
    });

    const history = await repo.getHistory(ticket.id);
    expect(history).toHaveLength(2); // 최초 접수 + 배정
    expect(history[0].toStatus).toBe('RECEIVED');
    expect(history[1]).toMatchObject({ fromStatus: 'RECEIVED', toStatus: 'ASSIGNED', changedBy: 100 });
  });
});

describe('존재하지 않는 티켓', () => {
  it('상세 조회 시 NotFoundError', async () => {
    const { service } = buildService();
    await expect(service.getTicketDetail(9999)).rejects.toBeInstanceOf(NotFoundError);
  });
});
