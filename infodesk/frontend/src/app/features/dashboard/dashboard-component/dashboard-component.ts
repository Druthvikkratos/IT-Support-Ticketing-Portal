import { Component, inject } from '@angular/core';
import { AdminDashboard } from '../admin-dashboard/admin-dashboard';
import { EmployeeDashboard } from '../employee-dashboard/employee-dashboard';
import { AuthService } from '../../../core/services/auth-service';

@Component({
  selector: 'app-dashboard-component',
  imports: [AdminDashboard, EmployeeDashboard],
  templateUrl: './dashboard-component.html',
  styleUrl: './dashboard-component.scss',
})
export class DashboardComponent {
  authService = inject(AuthService);
}
