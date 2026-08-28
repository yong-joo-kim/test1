# QA-TICKET-001

## 검수 대상
src/domains/ticket/** (REQ-TICKET-001 / ticket-api.yaml 기준)

## 체크리스트
- [PASS] AC-1 정상 접수 시 RECEIVED 상태 생성 + ticket.created 이벤트 발행
- [PASS] AC-2 COMPLETED/CANCELLED 이후 불법 전이 차단 (400)
- [PASS] AC-3 배정된 기사가 아닌 기사의 상태변경 차단 (403)
- [PASS] AC-4 HOLD → 보류 직전 상태로만 복귀
- [PASS] FR-5 모든 상태 변경 이력 기록 (append-only)
- [PASS] FR-8 URGENT 우선순위 SLA 4시간 자동 계산
- [PASS] API 계약(ticket-api.yaml)과 라우트/컨트롤러 시그니처 일치
- [PASS] 상태머신 코드가 요구사항 상태 전이표와 100% 일치

## 결함 목록 (발견 → 수정 완료)
| ID | 심각도 | 내용 | 조치 |
|---|---|---|---|
| DEF-001 | Critical | `common/errors`에 `ForbiddenError`/`UnauthorizedError` 미정의로 빌드 실패 | 공통 에러 모듈에 클래스 추가, 재검증 통과 |
| DEF-002 | High | FR-7 권한 로직이 최초 배정(RECEIVED→ASSIGNED) 시 담당자가 없는데도 무조건 차단하는 논리 오류 | `assignedEngineerId === null`인 경우 예외 처리하도록 수정, 재검증 통과 |
| DEF-003 | Low | 상태머신 `FORWARD_TRANSITIONS[current] ?? []`에서 도달 불가능한 분기로 커버리지 100% 미달 | 불필요한 optional 체이닝 제거 |

## 테스트 실행 결과 (test-agent 산출물 기준)
- Test Suites: 2 passed / 2 total
- Tests: 23 passed / 23 total
- ticket.statemachine.ts 커버리지: Statements 100 / Branch 100 / Functions 100 / Lines 100
- `tsc --noEmit` 타입체크 통과

## 종합 판정
**PASS** (결함 3건 모두 재작업 완료 및 재검증됨)

## 남은 리스크 (다음 스프린트 인지 필요)
- ticket.controller.ts / ticket.routes.ts는 통합(HTTP 레벨) 테스트가 아직 없음 → test-agent에게 supertest 기반 API 계약 테스트 추가 요청 필요
- InMemoryTicketRepository는 데모용이며 실제 PostgreSQL 구현체로 교체 필요 (deploy-agent 인프라 작업과 연계)
