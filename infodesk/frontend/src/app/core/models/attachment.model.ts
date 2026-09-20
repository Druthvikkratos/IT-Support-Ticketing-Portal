export interface TicketAttachment {
  id: string;
  ticketId: string;
  fieldId: number | null;
  originalName: string;
  fileSize: number;
  detectedMime: string;
  uploadedAt: string;
}