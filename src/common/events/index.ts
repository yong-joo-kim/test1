// 공통 이벤트 버스 인터페이스 — 도메인 간 직접 테이블 접근을 막고 이벤트로만 통신하게 강제한다.
// 실제 구현체(Kafka/SQS/InMemory 등)는 배포 환경에 따라 교체 가능하도록 인터페이스만 고정한다.

export type DomainEvent =
  | { type: 'ticket.created'; payload: { ticketId: number; customerId: number; priority: string } }
  | { type: 'ticket.status_changed'; payload: { ticketId: number; from: string | null; to: string; changedBy: number } };

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

// 개발/테스트용 인메모리 구현. 프로덕션에서는 deploy-agent가 실제 메시지 브로커 구현으로 교체한다.
class InMemoryEventPublisher implements EventPublisher {
  private log: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.log.push(event);
    // eslint-disable-next-line no-console
    console.log('[EVENT_PUBLISHED]', JSON.stringify(event));
  }

  getPublished(): DomainEvent[] {
    return this.log;
  }
}

export const events: EventPublisher & { getPublished?: () => DomainEvent[] } = new InMemoryEventPublisher();
