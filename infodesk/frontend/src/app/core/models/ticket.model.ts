export type Priority = 'low' | 'high';
export type TicketStatus = 'raised' | 'pending' | 'in_progress' | 'solved' | 'closed';

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  issueTypeId: number;
  issueType: { id: number; name: string };
  priority: Priority;
  status: TicketStatus;
  phoneNumber: string;
  customFieldValues: Record<string, any> | null;
  raisedById: string;
  raisedBy: { id: string; name: string; employeeCode: string | null; email?: string };
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  statusHistory?: TicketStatusHistoryEntry[];
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  issueTypeId: number;
  priority: Priority;
  phoneNumber: string;
  customFieldValues?: Record<string, any>;
}

// shared status display config — used by every ticket screen so the
// colors and labels never drift between admin and employee views
export const STATUS_CONFIG: Record<TicketStatus, { label: string; class: string }> = {
  raised: { label: 'Raised', class: 'status-raised' },
  pending: { label: 'Pending', class: 'status-pending' },
  in_progress: { label: 'In Progress', class: 'status-progress' },
  solved: { label: 'Solved', class: 'status-solved' },
  closed: { label: 'Closed', class: 'status-closed' },
};

export interface TicketStatusHistoryEntry {
  id: string;
  oldStatus: TicketStatus | null;
  newStatus: TicketStatus;
  changedAt: string;
  changedBy: { id: string; name: string; role: string };
}
