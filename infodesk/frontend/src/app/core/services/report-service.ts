import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private http = inject(HttpClient);

  downloadTicketReport(dateFrom?: string, dateTo?: string): Observable<Blob> {
    let params: Record<string, string> = {};
    if (dateFrom) params['dateFrom'] = dateFrom;
    if (dateTo) params['dateTo'] = dateTo;

    return this.http.get(`${environment.apiUrl}/reports/tickets`, { params, responseType: 'blob' });
  }
}
