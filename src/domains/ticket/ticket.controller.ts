import { TicketService } from './ticket.service';
import { AuthedRequest, requireAuth } from '../../common/auth';
import { BadRequestError } from '../../common/errors';
import { ChangeStatusInput, CreateTicketInput, TicketSearchQuery } from './ticket.types';

/**
 * 프레임워크 비의존적 컨트롤러. Express 등에 얇은 어댑터로 감싸서 사용한다.
 * 계약(ticket-api.yaml)의 요청/응답 형태를 그대로 따른다.
 */
export class TicketController {
  constructor(private service: TicketService) {}

  async create(req: AuthedRequest) {
    const user = requireAuth(req);
    const body = req.body as Partial<CreateTicketInput>;

    if (!body.customerId || !body.title || !body.description || !body.channel || !body.priority) {
      throw new BadRequestError('MISSING_FIELD', '필수 항목이 누락되었습니다.');
    }

    const input: CreateTicketInput = {
      customerId: body.customerId,
      productId: body.productId ?? null,
      title: body.title,
      description: body.description,
      channel: body.channel,
      priority: body.priority,
      createdBy: user.id,
    };

    return this.service.createTicket(input);
  }

  async list(req: AuthedRequest) {
    requireAuth(req);
    const q = req.query;

    const query: TicketSearchQuery = {
      status: q.status as TicketSearchQuery['status'],
      customerName: q.customerName,
      engineerId: q.engineerId ? Number(q.engineerId) : undefined,
      from: q.from,
      to: q.to,
      page: q.page ? Number(q.page) : 0,
      size: q.size ? Number(q.size) : 20,
    };

    const result = await this.service.search(query);
    return { content: result.content, page: query.page, size: query.size, totalElements: result.totalElements };
  }

  async detail(req: AuthedRequest) {
    requireAuth(req);
    const id = Number(req.params.id);
    return this.service.getTicketDetail(id);
  }

  async changeStatus(req: AuthedRequest) {
    const user = requireAuth(req);
    const id = Number(req.params.id);
    const body = req.body as { toStatus?: string; reason?: string };

    if (!body.toStatus || !body.reason) {
      throw new BadRequestError('MISSING_FIELD', 'toStatus와 reason은 필수입니다.');
    }

    const input: ChangeStatusInput = {
      ticketId: id,
      toStatus: body.toStatus as ChangeStatusInput['toStatus'],
      reason: body.reason,
      actorId: user.id,
      actorRole: user.role,
    };

    return this.service.changeStatus(input);
  }
}
