import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminDashboardSummary, EmployeeDashboardSummary } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);

  getAdminSummary(): Observable<AdminDashboardSummary> {
    return this.http.get<AdminDashboardSummary>(`${environment.apiUrl}/dashboard/admin`);
  }
  getEmployeeSummary(): Observable<EmployeeDashboardSummary> {
    return this.http.get<EmployeeDashboardSummary>(`${environment.apiUrl}/dashboard/employee`);
  }
}
