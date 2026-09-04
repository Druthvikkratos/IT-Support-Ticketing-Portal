import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { PaginatedResponse } from '../models/paginated-response.model';
import { CreateAdminPayload, CreateEmployeePayload, User } from '../models/user.model';

export interface UsersQuery {
  page: number;
  limit: number;
  search: string;
  role?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/users`;

  findAllUsers(query: UsersQuery): Observable<PaginatedResponse<User>> {
    let params: Record<string, string> = { page: String(query.page), limit: String(query.limit) };
    if (query.search) params['search'] = query.search;
    if (query.role) params['role'] = query.role;
    if (query.isActive !== undefined) params['isActive'] = String(query.isActive);
    return this.http.get<PaginatedResponse<User>>(this.base, { params });
  }

  createAdmin(payload: CreateAdminPayload): Observable<User> {
    return this.http.post<User>(`${this.base}/admin`, payload);
  }

  createEmployee(payload: CreateEmployeePayload): Observable<User> {
    return this.http.post<User>(`${this.base}/employee`, payload);
  }

  deactivate(id: string): Observable<User> {
    return this.http.delete<User>(`${this.base}/${id}`);
  }
}
