# 도메인 분해 — 제품 AS/고객센터 운영관리 시스템

| 도메인 | 소유 테이블 | 담당 에이전트 | 상태 |
|---|---|---|---|
| customer | customers, products | customer-impl-agent | 대기 |
| ticket | tickets, ticket_status_history | ticket-impl-agent | **1차 스프린트** |
| dispatch | dispatch_assignments, engineer_schedules | dispatch-impl-agent | 대기 |
| inventory | parts, part_stock, part_movements | inventory-impl-agent | 대기 |
| contract | warranties, sla_policies | contract-impl-agent | 대기 |
| report | (읽기 전용, 타 도메인 집계) | report-impl-agent | 대기 |
| notify | notification_logs | notify-impl-agent | 대기 |
| auth | users, roles, permissions | auth-impl-agent | 선행 완료 가정 |
| portal | (고객용 프론트, ticket API 재사용) | portal-impl-agent | 대기 |

## 도메인 간 이벤트 계약 (요약)
- ticket.created → notify(접수 알림), dispatch(배정 대기열 등록)
- ticket.status_changed(→배정) → dispatch가 발행, ticket이 구독하여 상태 갱신
- ticket.status_changed(→완료) → inventory(부품 소모 확정), report(집계), notify(완료 알림)
- inventory.low_stock → notify(관리자 알림)

## 1차 스프린트 범위: ticket 도메인
접수 생성 → 배정 대기 → (dispatch 도메인과 연동, 이번 스프린트에서는 이벤트 발행까지만) →
처리중 → 완료/취소, 상태 이력 관리, 검색/필터, 담당 상담원 권한 제어
