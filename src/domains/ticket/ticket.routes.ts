import { Router, Request, Response, NextFunction } from 'express';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { InMemoryTicketRepository } from './ticket.repository';
import { events } from '../../common/events';
import { toErrorResponse } from '../../common/errors';
import { AuthedRequest } from '../../common/auth';

const repository = new InMemoryTicketRepository();
const service = new TicketService(repository, events);
const controller = new TicketController(service);

function asAuthed(req: Request): AuthedRequest {
  // 실제 배포에서는 인증 미들웨어가 req.user를 세팅한다 (JWT 검증 등). 여기서는 계약만 표현.
  return req as unknown as AuthedRequest;
}

function handle(fn: (req: AuthedRequest) => Promise<unknown>) {
  return async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const result = await fn(asAuthed(req));
      const status = req.method === 'POST' ? 201 : 200;
      res.status(status).json(result);
    } catch (err) {
      const { status, body } = toErrorResponse(err);
      res.status(status).json(body);
    }
  };
}

export const ticketRouter = Router();

ticketRouter.post('/api/tickets', handle((req) => controller.create(req)));
ticketRouter.get('/api/tickets', handle((req) => controller.list(req)));
ticketRouter.get('/api/tickets/:id', handle((req) => controller.detail(req)));
ticketRouter.patch('/api/tickets/:id/status', handle((req) => controller.changeStatus(req)));

// 테스트에서 서비스/레포지토리에 직접 접근할 수 있도록 export (계약 테스트용)
export const __testing__ = { repository, service, controller };
