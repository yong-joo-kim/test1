// 공통 에러 타입 — 모든 도메인은 이 에러를 던지면 공통 에러 핸들러가 API 계약에 맞는 응답으로 변환한다.

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export class BadRequestError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', message, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super('FORBIDDEN', message, 403);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super('UNAUTHORIZED', message, 401);
  }
}

export function toErrorResponse(err: unknown) {
  if (err instanceof AppError) {
    return { status: err.status, body: { code: err.code, message: err.message } };
  }
  // 예상하지 못한 에러는 500으로 처리하고 상세 내용은 로깅만 (응답에 노출 금지)
  console.error('[UNEXPECTED_ERROR]', err);
  return { status: 500, body: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } };
}
