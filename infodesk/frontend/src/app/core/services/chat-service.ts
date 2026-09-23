import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatMessage, TicketAttachmentSummary } from '../models/chat-message.model';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);

  getHistory(ticketId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${environment.apiUrl}/tickets/${ticketId}/messages`);
  }

  uploadAttachment(ticketId: string, file: File): Observable<TicketAttachmentSummary> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<TicketAttachmentSummary>(
      `${environment.apiUrl}/tickets/${ticketId}/messages/attachment`,
      formData,
    );
  }

  attachmentViewUrl(ticketId: string, filePath: string): string {
    return `${environment.apiUrl}/tickets/${ticketId}/messages/attachment/view?path=${encodeURIComponent(filePath)}`;
  }

  markAsRead(ticketId: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${environment.apiUrl}/tickets/${ticketId}/messages/read`,
      {},
    );
  }
}
