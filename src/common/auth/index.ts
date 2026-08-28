// 공통 인증/인가 모듈 — 모든 도메인 에이전트는 이 모듈을 그대로 사용한다 (재구현 금지)

export type Role = 'AGENT' | 'ENGINEER' | 'ADMIN' | 'CUSTOMER';

export interface AuthUser {
  id: number;
  role: Role;
  name: string;
}

// Express 스타일 Request 확장 (프레임워크 비의존적으로 최소 표기)
export interface AuthedRequest {
  user: AuthUser;
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
}

export class UnauthorizedError extends Error {
  status = 401;
  code = 'UNAUTHORIZED';
}

export class ForbiddenError extends Error {
  status = 403;
  code = 'FORBIDDEN';
}

/** 인증 미들웨어: 토큰 검증 후 req.user 세팅 (실제 JWT 검증 로직은 인프라에 따라 구현) */
export function requireAuth(req: AuthedRequest): AuthUser {
  if (!req.user) throw new UnauthorizedError('로그인이 필요합니다.');
  return req.user;
}

/** 역할 기반 인가 */
export function requireRole(user: AuthUser, allowed: Role[]): void {
  if (!allowed.includes(user.role)) {
    throw new ForbiddenError(`이 작업은 ${allowed.join('/')} 권한이 필요합니다.`);
  }
}
