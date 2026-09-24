export interface StatusCounts {
  raised: number;
  pending: number;
  in_progress: number;
  solved: number;
  closed: number;
  [key: string]: number;
}
export interface PriorityCounts {
  low: number;
  high: number;
}
export interface TrendPoint {
  date: string;
  count: number;
}

export interface ActivityEvent {
  id: string;
  type: 'status_change' | 'message';
  ticketId: string;
  ticketNumber: string;
  priority: 'low' | 'high';
  actorName: string;
  actorRole: string;
  label: string;
  createdAt: string;
}

export interface AdminDashboardSummary {
  statusCounts: StatusCounts;
  priorityCounts: PriorityCounts;
  trend: TrendPoint[];
  activityFeed: ActivityEvent[];
}
export interface EmployeeDashboardSummary {
  statusCounts: StatusCounts;
  activityFeed: ActivityEvent[];
}
