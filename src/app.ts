import express from 'express';
import { ticketRouter } from './domains/ticket/ticket.routes';

export function createApp() {
  const app = express();
  app.use(express.json());

  // 데모용 인증 스텁 — 실제로는 auth 도메인의 JWT 미들웨어로 교체
  app.use((req, _res, next) => {
    (req as any).user = { id: 1, role: req.header('x-role') ?? 'AGENT', name: 'demo-user' };
    next();
  });

  app.use(ticketRouter);
  // 다음 스프린트: app.use(customerRouter), app.use(dispatchRouter), ...

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT ?? 3000;
  app.listen(port, () => console.log(`AS-CMS ticket service listening on :${port}`));
}
