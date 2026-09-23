export interface ChatMessage {
  id: string;
  ticketId: string;
  senderId: string;
  message: string | null;
  attachmentId: string | null;
  attachment: TicketAttachmentSummary | null;
  createdAt: string;
  sender: { id: string; name: string; role: string };
}


export interface TicketAttachmentSummary {
  id: string;
  originalName: string;
  fileSize: number;
  detectedMime: string;
}