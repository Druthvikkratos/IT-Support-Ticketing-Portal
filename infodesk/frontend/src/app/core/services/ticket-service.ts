import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { map, Observable } from 'rxjs';
import { PaginatedResponse } from '../models/paginated-response.model';
import { CreateTicketPayload, Ticket } from '../models/ticket.model';

export interface TicketsQuery {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  priority?: string;
  issueTypeId?: number;
  sortField?: string;
  sortDir?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tickets`;

  private buildParams(query: TicketsQuery): Record<string, string> {
    const params: Record<string, string> = { page: String(query.page), limit: String(query.limit) };
    if (query.search) params['search'] = query.search;
    if (query.status) params['status'] = query.status;
    if (query.priority) params['priority'] = query.priority;
    if (query.issueTypeId) params['issueTypeId'] = String(query.issueTypeId);
    if (query.sortField) params['sortField'] = query.sortField;
    if (query.sortDir) params['sortDir'] = query.sortDir;
    return params;
  }

  findMine(query: TicketsQuery): Observable<PaginatedResponse<Ticket>> {
    return this.http.get<PaginatedResponse<Ticket>>(`${this.base}/my`, {
      params: this.buildParams(query),
    });
  }

  findAll(query: TicketsQuery): Observable<PaginatedResponse<Ticket>> {
    return this.http.get<PaginatedResponse<Ticket>>(this.base, { params: this.buildParams(query) });
  }

  findOne(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.base}/${id}`);
  }

  create(payload: CreateTicketPayload): Observable<Ticket> {
    return this.http.post<Ticket>(this.base, payload);
  }

  update(id: string, payload: CreateTicketPayload): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.base}/${id}`, payload);
  }

  updateStatus(id: string, status: string): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.base}/${id}/status`, { status });
  }

  close(id: string): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.base}/${id}/close`, {});
  }

  claim(ticketId: string): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.base}/${ticketId}/claim`, {});
  }
  reassign(ticketId: string, newAdminId: string): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.base}/${ticketId}/reassign`, { newAdminId });
  }
}
