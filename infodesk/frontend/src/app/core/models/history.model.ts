export interface HistoryEvent {
  id: string;
  type: 'status_change' | 'message';
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  priority: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  label: string;
  createdAt: string;
}

export interface HistoryActor {
  id: string;
  name: string;
  role: string;
}
