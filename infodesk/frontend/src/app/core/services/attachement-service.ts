import { HttpClient, HttpEvent } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TicketAttachment } from '../models/attachment.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AttachementService {
  private http = inject(HttpClient);

  upload(
    ticketId: string,
    fieldId: number,
    files: File[],
  ): Observable<HttpEvent<TicketAttachment[]>> {
    const formData = new FormData();
    formData.append('fieldId', String(fieldId));
    files.forEach((file) => formData.append('files', file));
    return this.http.post<TicketAttachment[]>(
      `${environment.apiUrl}/tickets/${ticketId}/attachments`,
      formData,
      { reportProgress: true, observe: 'events' },
    );
  }

  findByTicket(ticketId: string): Observable<TicketAttachment[]> {
    return this.http.get<TicketAttachment[]>(
      `${environment.apiUrl}/tickets/${ticketId}/attachments`,
    );
  }

  downloadUrl(ticketId: string, attachmentId: string): string {
    return `${environment.apiUrl}/tickets/${ticketId}/attachments/${attachmentId}/download`;
  }

  viewUrl(ticketId: string, attachmentId: string): string {
    return `${environment.apiUrl}/tickets/${ticketId}/attachments/${attachmentId}/view`;
  }
}
