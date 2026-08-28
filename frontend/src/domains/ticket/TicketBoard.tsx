import React, { useMemo, useState } from 'react';

// ── 타입 (ticket-api.yaml 계약과 1:1 대응) ─────────────────────────────
type TicketStatus = 'RECEIVED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'HOLD';
type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

interface Ticket {
  id: number;
  ticketNo: string;
  customerName: string;
  title: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedEngineerName: string | null;
  createdAt: string;
}

// ── DESIGN-TICKET-001 디자인 토큰: 상태 배지 팔레트 ───────────────────
const STATUS_STYLE: Record<TicketStatus, { bg: string; fg: string; label: string }> = {
  RECEIVED: { bg: '#F1F5F9', fg: '#475569', label: '접수' },
  ASSIGNED: { bg: '#DBEAFE', fg: '#1D4ED8', label: '배정' },
  IN_PROGRESS: { bg: '#FFEDD5', fg: '#C2410C', label: '처리중' },
  COMPLETED: { bg: '#DCFCE7', fg: '#15803D', label: '완료' },
  CANCELLED: { bg: '#FEE2E2', fg: '#B91C1C', label: '취소' },
  HOLD: { bg: '#EDE9FE', fg: '#6D28D9', label: '보류' },
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  LOW: '낮음',
  NORMAL: '보통',
  HIGH: '높음',
  URGENT: '긴급',
};

// 상태머신(백엔드 ticket.statemachine.ts)과 동일한 규칙을 프론트에서도 표현해
// 불가능한 액션 버튼은 아예 비활성화한다 (UX 선제 차단, 최종 검증은 서버가 담당)
const NEXT_ACTIONS: Record<TicketStatus, { to: TicketStatus; label: string }[]> = {
  RECEIVED: [
    { to: 'ASSIGNED', label: '기사 배정' },
    { to: 'HOLD', label: '보류' },
    { to: 'CANCELLED', label: '취소' },
  ],
  ASSIGNED: [
    { to: 'IN_PROGRESS', label: '처리 시작' },
    { to: 'HOLD', label: '보류' },
    { to: 'CANCELLED', label: '취소' },
  ],
  IN_PROGRESS: [
    { to: 'COMPLETED', label: '완료 처리' },
    { to: 'HOLD', label: '보류' },
    { to: 'CANCELLED', label: '취소' },
  ],
  HOLD: [{ to: 'IN_PROGRESS', label: '보류 해제' }],
  COMPLETED: [],
  CANCELLED: [],
};

// ── 데모 데이터 (실제로는 GET /api/tickets 응답으로 대체) ──────────────
const DEMO_TICKETS: Ticket[] = [
  { id: 1, ticketNo: 'AS-20260820-0001', customerName: '홍길동', title: '화면이 안 나와요', priority: 'HIGH', status: 'ASSIGNED', assignedEngineerName: '김기사', createdAt: '2026-08-20T09:12:00Z' },
  { id: 2, ticketNo: 'AS-20260820-0002', customerName: '이순신', title: '전원 버튼 반응 없음', priority: 'URGENT', status: 'RECEIVED', assignedEngineerName: null, createdAt: '2026-08-20T10:03:00Z' },
  { id: 3, ticketNo: 'AS-20260819-0031', customerName: '유관순', title: '탈수 소음 심함', priority: 'NORMAL', status: 'IN_PROGRESS', assignedEngineerName: '박기사', createdAt: '2026-08-19T15:41:00Z' },
  { id: 4, ticketNo: 'AS-20260819-0030', customerName: '강감찬', title: '냉장고 온도 이상', priority: 'LOW', status: 'COMPLETED', assignedEngineerName: '박기사', createdAt: '2026-08-19T11:20:00Z' },
];

function StatusBadge({ status }: { status: TicketStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      style={{ backgroundColor: s.bg, color: s.fg }}
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
    >
      {s.label}
    </span>
  );
}

export default function TicketBoard() {
  const [tickets, setTickets] = useState<Ticket[]>(DEMO_TICKETS);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('ALL');
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [statusTarget, setStatusTarget] = useState<TicketStatus | null>(null);
  const [statusReason, setStatusReason] = useState('');

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchKeyword =
        keyword.trim() === '' ||
        t.customerName.includes(keyword) ||
        t.ticketNo.includes(keyword) ||
        t.title.includes(keyword);
      return matchStatus && matchKeyword;
    });
  }, [tickets, statusFilter, keyword]);

  function handleChangeStatus(ticketId: number, toStatus: TicketStatus) {
    setStatusTarget(toStatus);
    setStatusReason('');
  }

  function confirmChangeStatus() {
    if (!selected || !statusTarget || !statusReason.trim()) return;
    // 실제로는: PATCH /api/tickets/{id}/status  { toStatus, reason }
    setTickets((prev) => prev.map((t) => (t.id === selected.id ? { ...t, status: statusTarget } : t)));
    setSelected((prev) => (prev ? { ...prev, status: statusTarget } : prev));
    setStatusTarget(null);
    setStatusReason('');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">AS 티켓 관리</h1>
            <p className="mt-1 text-sm text-slate-500">접수부터 완료까지 처리 현황을 추적합니다.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            + 신규 접수
          </button>
        </header>

        {/* 검색/필터 바 */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="고객명 / 티켓번호 / 제목 검색"
            className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'ALL')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="ALL">전체 상태</option>
            {(Object.keys(STATUS_STYLE) as TicketStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_STYLE[s].label}
              </option>
            ))}
          </select>
        </div>

        {/* 목록 테이블 */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">티켓번호</th>
                <th className="px-4 py-3">고객명</th>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">우선순위</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">담당기사</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    조건에 맞는 티켓이 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelected(t)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelected(t)}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{t.ticketNo}</td>
                    <td className="px-4 py-3">{t.customerName}</td>
                    <td className="px-4 py-3">{t.title}</td>
                    <td className="px-4 py-3">{PRIORITY_LABEL[t.priority]}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.assignedEngineerName ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 상세 슬라이드오버 */}
      {selected && (
        <div className="fixed inset-0 z-20 flex justify-end bg-black/20" onClick={() => setSelected(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-slate-400">{selected.ticketNo}</p>
                <h2 className="mt-1 text-lg font-semibold">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">
                닫기
              </button>
            </div>

            <div className="mb-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">고객</span><span>{selected.customerName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">우선순위</span><span>{PRIORITY_LABEL[selected.priority]}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">담당기사</span><span>{selected.assignedEngineerName ?? '미배정'}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-500">상태</span><StatusBadge status={selected.status} /></div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">상태 변경</p>
              <div className="flex flex-wrap gap-2">
                {NEXT_ACTIONS[selected.status].length === 0 ? (
                  <p className="text-sm text-slate-400">더 이상 변경할 수 없는 종결 상태입니다.</p>
                ) : (
                  NEXT_ACTIONS[selected.status].map((action) => (
                    <button
                      key={action.to}
                      onClick={() => handleChangeStatus(selected.id, action.to)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                    >
                      {action.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && statusTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={() => setStatusTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">상태 변경 사유</h2>
            <p className="mt-1 text-sm text-slate-500">
              {STATUS_STYLE[selected.status].label}에서 {STATUS_STYLE[statusTarget].label}(으)로 변경합니다.
            </p>
            <textarea
              autoFocus
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="변경 사유를 입력하세요"
              rows={4}
              className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setStatusTarget(null)} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                취소
              </button>
              <button
                onClick={confirmChangeStatus}
                disabled={!statusReason.trim()}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                상태 변경
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 신규 접수 모달 (필드는 CreateTicketRequest 계약과 동일) */}
      {showCreate && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30" onClick={() => setShowCreate(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">신규 AS 접수</h2>
            <p className="text-sm text-slate-500">
              고객 검색 → 제품 선택 → 제목/설명/우선순위 입력 흐름 (POST /api/tickets 연동 지점).
              이 데모에서는 폼 구현을 생략했습니다.
            </p>
            <button
              onClick={() => setShowCreate(false)}
              className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
