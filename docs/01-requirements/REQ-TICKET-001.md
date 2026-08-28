# REQ-TICKET-001: AS 티켓 접수 및 상태 관리

## 배경
고객의 제품 장애 신고를 상담원이 접수하면 티켓이 생성되고, 이후 배정→처리중→완료의 흐름을 거친다.
현재 유선/이메일로만 접수되어 이력 추적이 안 되는 문제를 해결한다.

## 액터
- 상담원(AGENT): 접수 생성, 상태 조회/검색
- 기사(ENGINEER): 배정받은 티켓의 상태를 처리중/완료로 변경
- 관리자(ADMIN): 전체 티켓 조회, 강제 취소/보류 가능

## 기능 요구사항
- FR-1. 상담원은 고객/제품 정보와 함께 신규 AS 티켓을 접수할 수 있다.
- FR-2. 티켓은 RECEIVED → ASSIGNED → IN_PROGRESS → COMPLETED 순서로 상태가 전이된다.
- FR-3. 어느 상태에서든 ADMIN 또는 담당자는 CANCELLED로 전이할 수 있다 (단, COMPLETED 이후는 불가).
- FR-4. RECEIVED, ASSIGNED, IN_PROGRESS 상태에서 HOLD(보류)로 전이 가능하며, HOLD에서는 직전 상태로만 복귀 가능하다.
- FR-5. 모든 상태 변경은 이력(변경자, 시각, 사유)이 기록되어야 한다.
- FR-6. 상담원/기사는 상태·기간·고객명·담당기사로 티켓을 검색할 수 있다.
- FR-7. 기사는 자신에게 배정된 티켓만 상태 변경 가능하다 (ADMIN 제외).
- FR-8. 접수 시 우선순위(LOW/NORMAL/HIGH/URGENT)를 지정하며, URGENT는 SLA 기한이 4시간으로 자동 설정된다.

## 수용 기준 (Acceptance Criteria)

### 시나리오 1: 정상 접수
- Given 상담원이 로그인되어 있고 고객/제품 정보가 존재할 때
- When 상담원이 제목/설명/우선순위를 입력해 접수를 요청하면
- Then 상태 RECEIVED인 티켓이 생성되고 ticket.created 이벤트가 발행된다

### 시나리오 2: 불법 상태 전이 차단
- Given 티켓이 COMPLETED 상태일 때
- When 누군가 상태를 IN_PROGRESS로 변경 요청하면
- Then 400 Bad Request와 함께 "invalid transition" 에러가 반환되고 상태는 변경되지 않는다

### 시나리오 3: 기사 권한 제한
- Given 티켓이 기사 A에게 배정되어 있을 때
- When 기사 B가 해당 티켓 상태를 변경 요청하면
- Then 403 Forbidden이 반환된다

### 시나리오 4: HOLD 복귀
- Given 티켓이 IN_PROGRESS에서 HOLD로 전이되었을 때
- When 담당자가 HOLD를 해제하면
- Then 티켓은 IN_PROGRESS로 복귀한다 (RECEIVED/ASSIGNED로는 복귀 불가)

## 비기능 요구사항
- 성능: 목록 검색 API는 응답 1초 이내 (인덱스: status, customer_id, created_at)
- 보안: 모든 쓰기 API는 인증 필요, 상태변경은 인가(역할+소유권) 필요
- 감사: ticket_status_history에 모든 전이 기록, 삭제 불가(append-only)

## 화면 목록
1. 티켓 목록/검색 화면 (design-agent → DESIGN-TICKET-001)
2. 티켓 접수 등록 폼
3. 티켓 상세/상태변경 화면

## 연관 도메인 / 이벤트
- 발행: ticket.created, ticket.status_changed
- 구독: 없음 (이번 스프린트 기준)

## 범위 제외
- 실제 기사 자동배정 로직(dispatch 도메인 별도 스프린트)
- 부품 재고 연동(inventory 도메인 별도 스프린트)
