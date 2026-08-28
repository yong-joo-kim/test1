# test1
vibe coding 시험용

# AS-CMS System — 멀티 에이전트 Vibe Coding 자동개발 예제

제품 AS/고객센터 운영관리 웹 시스템(100인 규모 SI)을 PM 에이전트가 총괄하고,
기능별 전담 에이전트가 협업하여 자동 개발한 파이프라인의 **ticket 도메인** 실행 결과물입니다.

## 이 저장소로 보여주는 것
`.claude/agents/`에 정의된 9개 에이전트가 실제로 아래 순서로 협업해 만든 산출물입니다.

```
orchestrator (PM)
  └─ docs/00-orchestration/domains.md   ← 전체 도메인 분해
  └─ docs/schema/schema.sql             ← 전체 DB 스키마(계약)
      │
      ▼
requirements-agent
  └─ docs/01-requirements/REQ-TICKET-001.md
      │
      ▼
design-agent
  └─ docs/02-design/DESIGN-TICKET-001.md
  └─ docs/03-api/ticket-api.yaml (OpenAPI, 계약의 원천)
      │
      ▼
ticket-impl-agent
  └─ src/domains/ticket/*.ts (상태머신/서비스/리포지토리/컨트롤러/라우트)
  └─ frontend/src/domains/ticket/TicketBoard.tsx
      │
      ▼
qa-agent            ← 실제로 결함 2건 발견 (ForbiddenError 누락, 권한로직 버그)
  └─ docs/04-qa/QA-TICKET-001.md
      │
      ▼
test-agent
  └─ src/domains/ticket/__tests__/*.test.ts (23 tests, 상태머신 커버리지 100%)
      │
      ▼
deploy-agent
  └─ .github/workflows/ci-cd.yml (승인 게이트 포함, 자동 프로덕션 배포 없음)
      │
      ▼
vcs-agent
  └─ CHANGELOG.md
      │
      ▼
maintenance-agent
  └─ docs/05-maintenance/RUNBOOK-TICKET.md
```

## 실제로 검증됨
```bash
npm install
npx tsc -p . --noEmit   # 타입체크 통과
npx jest --coverage     # 23 tests passed, statemachine 100% coverage
```

## 이 구조를 다른 도메인(customer, dispatch, inventory...)에 그대로 반복하면
`docs/00-orchestration/domains.md`에 정의된 나머지 8개 도메인도 동일한 파이프라인
(requirements → design → impl → qa → test → deploy → vcs → maintenance)으로
병렬 확장할 수 있습니다. 각 도메인 에이전트는 자신의 테이블만 소유하고,
도메인 간 통신은 `src/common/events`를 통해서만 이루어지므로 100인 규모 조직에서도
여러 팀(에이전트 세션)이 충돌 없이 동시에 개발할 수 있습니다.

## 핵심 원칙 (왜 이 구조가 통합 실패 없이 돌아가는가)
1. **계약 우선**: DB 스키마(schema.sql)와 API 계약(*.yaml)이 먼저 고정되고, 구현 에이전트는 이를 읽기 전용으로만 사용
2. **도메인별 쓰기 소유권 분리**: ticket-impl-agent는 tickets 테이블만 쓴다. 다른 도메인 데이터가 필요하면 이벤트 발행만 가능
3. **자동화 vs 승인 게이트 분리**: 빌드/테스트/스테이징 배포는 완전 자동, 프로덕션 배포는 사람 승인 필수
4. **QA는 코드를 고치지 않는다**: 결함을 리포트만 하고 재작업은 impl-agent가 수행 → 역할 경계 유지로 책임 추적성 확보
