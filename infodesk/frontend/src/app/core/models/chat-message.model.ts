export interface ChatMessage {
  id: string;
  ticketId: string;
  senderId: string;
  message: string | null;
  attachment: ITicketAttachment;
  createdAt: string;
  sender: { id: string; name: string; role: string };
}


export interface ITicketAttachment {
  id: string;
  ticketId: string;
  fieldId: number | null;
  originalName: string;
  filePath: string;
  fileSize: number;
  detectedMime: string;
  uploadedById: string;
  uploadedAt: string;
}