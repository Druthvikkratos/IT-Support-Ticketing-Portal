export type NotificationType = 'ticket_raised' | 'status_changed' | 'new_message' | 'ticket_closed' | 'bulk_upload_result';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  ticketId: string | null;
  isRead: boolean;
  createdAt: string;
}