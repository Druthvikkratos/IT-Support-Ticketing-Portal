import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { HistoryEvent, HistoryActor } from '../models/history.model';
import { PaginatedResponse } from '../models/paginated-response.model';

export interface HistoryQuery {
  page: number;
  limit: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  actorId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/history`;

  findAll(query: HistoryQuery): Observable<PaginatedResponse<HistoryEvent>> {
    let params: Record<string, string> = { page: String(query.page), limit: String(query.limit) };
    if (query.search) params['search'] = query.search;
    if (query.dateFrom) params['dateFrom'] = query.dateFrom;
    if (query.dateTo) params['dateTo'] = query.dateTo;
    if (query.type) params['type'] = query.type;
    if (query.actorId) params['actorId'] = query.actorId;
    return this.http.get<PaginatedResponse<HistoryEvent>>(this.base, { params });
  }

  getActors(): Observable<HistoryActor[]> {
    return this.http.get<HistoryActor[]>(`${this.base}/actors`);
  }
}
