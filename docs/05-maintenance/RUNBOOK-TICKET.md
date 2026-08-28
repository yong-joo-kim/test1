# RUNBOOK-TICKET

## 알려진 장애 패턴
| 증상 | 원인 | 대응 | 재발방지 |
|---|---|---|---|
| 상태변경 400 다발 | 프론트가 계약에 없는 상태값 전송 | ticket-api.yaml enum 재확인, 프론트 배포 롤백 | 계약 테스트를 프론트 CI에도 연결 |
| 특정 기사만 403 다발 | 배정 정보 불일치(assignedEngineerId) | ticket_status_history로 실제 배정 이력 추적 후 수동 보정 | dispatch 도메인 연동 시 이벤트 정합성 테스트 추가 |

## 모니터링 지표
- API 에러율 (4xx/5xx), p95 응답시간
- 상태전이 실패율 (INVALID_TRANSITION 발생 빈도)
- URGENT 티켓 SLA 초과 건수 (slaDueAt 경과 & status != COMPLETED)

## 롤백 절차
1. 배포 파이프라인에서 이전 태그로 재배포
2. DB 마이그레이션이 포함된 배포였다면 down 마이그레이션 실행 전 데이터 백업 확인
3. 상태 불일치 티켓은 ticket_status_history 기준으로 수동 정정

## 에스컬레이션 기준
- Sev1 (전체 접수 불가): 즉시 사람 개입, 자동배포 파이프라인 일시 중단
- Sev2/3 (개별 티켓 이상): maintenance-agent가 재현 절차 기록 → hotfix 브랜치 생성 → qa-agent 검수 → vcs-agent 태깅 → 배포
