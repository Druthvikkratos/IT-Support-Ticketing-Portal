import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { PaginatedResponse } from '../models/paginated-response.model';
import { IssueType } from '../models/issue-type.model';

export interface IssueTypesQuery {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortField?: string;
  sortDir?: string;
}

@Injectable({
  providedIn: 'root',
})
export class IssueTypesService {
  private http = inject(HttpClient)
  private base = `${environment.apiUrl}/issue-types`;

  findAllForAdmin(query: IssueTypesQuery): Observable<PaginatedResponse<IssueType>>{
    let params: Record<string, string> = {page: String(query.page), limit: String(query.limit)}
    if(query.search) params['search'] = query.search
    if(query.isActive !== undefined) params['isActive'] = String(query.isActive)
    if(query.sortField) params['sortField'] = query.sortField
    if(query.sortDir) params ['sortDir'] = query.sortDir
    return this.http.get<PaginatedResponse<IssueType>>(this.base, {params})
  }

  findAllActive(): Observable<IssueType[]> {
    return this.http.get<IssueType[]>(`${this.base}/active`);
  }

  create(name: string): Observable<IssueType> {
    return this.http.post<IssueType>(this.base, { name });
  }

  update(id: number, name: string): Observable<IssueType> {
    return this.http.patch<IssueType>(`${this.base}/${id}`, { name });
  }

  toggleActive(id: number): Observable<IssueType> {
    return this.http.patch<IssueType>(`${this.base}/${id}/toggle-active`, {});
  }
}
