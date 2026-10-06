import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private http = inject(HttpClient);

  suggest(title: string, description: string) {
    return this.http.post<{ issueTypeId: number; priority: 'low' | 'high'; reason: string }>(
      `${environment.apiUrl}/ai/suggest-ticket`,
      { title, description },
    );
  }

  summarize(ticketId: string) {
    return this.http.post<{ summary: string }>(
      `${environment.apiUrl}/ai/tickets/${ticketId}/summary`,
      {},
    );
  }
}
