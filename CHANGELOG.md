# Changelog
Keep a Changelog 형식 / Semantic Versioning 준수

## [0.1.0] - 2026-08-20
### Added
- feat(ticket): 티켓 접수/조회/검색/상태변경 API 구현 (ticket-api.yaml v1.0.0 준수)
- feat(ticket): 상태머신 기반 전이 검증 (RECEIVED→ASSIGNED→IN_PROGRESS→COMPLETED, HOLD/CANCELLED 분기)
- feat(ticket): URGENT 우선순위 SLA 4시간 자동 계산 (FR-8)
- feat(common): 공통 인증/에러/이벤트 발행 모듈 신설
- feat(frontend): 티켓 목록/검색/상세/상태변경 화면 (DESIGN-TICKET-001)
- test(ticket): 상태머신 단위테스트 (분기 커버리지 100%), 서비스 통합테스트 23건

### Fixed
- fix(common): ForbiddenError/UnauthorizedError 누락으로 인한 빌드 실패 수정 (QA-TICKET-001 DEF-001)
- fix(ticket): 최초 배정(RECEIVED→ASSIGNED) 시 권한 검증 로직이 담당자 미지정 상태를 잘못 차단하던 버그 수정 (QA-TICKET-001 DEF-002)

### Known Issues
- 컨트롤러/라우트 레벨 HTTP 통합 테스트 미비 (다음 스프린트)
- InMemoryTicketRepository → 실 DB 구현체 교체 필요
