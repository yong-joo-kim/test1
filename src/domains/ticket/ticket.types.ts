// ticket-api.yaml 계약과 1:1 대응하는 타입 정의

export type TicketStatus =
  | 'RECEIVED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'HOLD';

export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type Channel = 'PHONE' | 'WEB' | 'APP' | 'EMAIL';

export interface Ticket {
  id: number;
  ticketNo: string;
  customerId: number;
  productId: number | null;
  title: string;
  description: string;
  channel: Channel;
  priority: TicketPriority;
  status: TicketStatus;
  assignedEngineerId: number | null;
  createdBy: number;
  slaDueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketStatusHistoryEntry {
  id: number;
  ticketId: number;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  changedBy: number;
  reason: string | null;
  changedAt: string;
}

export interface CreateTicketInput {
  customerId: number;
  productId?: number | null;
  title: string;
  description: string;
  channel: Channel;
  priority: TicketPriority;
  createdBy: number;
}

export interface ChangeStatusInput {
  ticketId: number;
  toStatus: TicketStatus;
  reason: string;
  actorId: number;
  actorRole: 'AGENT' | 'ENGINEER' | 'ADMIN' | 'CUSTOMER';
}

export interface TicketSearchQuery {
  status?: TicketStatus;
  customerName?: string;
  engineerId?: number;
  from?: string;
  to?: string;
  page: number;
  size: number;
}
