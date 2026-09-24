import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { DashboardService } from '../../../core/services/dashboard-service';
import { EmployeeDashboardSummary } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-employee-dashboard',
  imports: [RouterLink, RelativeTimePipe],
  templateUrl: './employee-dashboard.html',
  styleUrl: '../admin-dashboard/admin-dashboard.scss',
})
export class EmployeeDashboard {
  private dashboardService = inject(DashboardService);

  summary = signal<EmployeeDashboardSummary | null>(null);
  loading = signal(true);

  statusCards = [
    { key: 'raised', label: 'Raised', icon: 'ti-flag', class: 'card-raised' },
    { key: 'pending', label: 'Pending', icon: 'ti-clock', class: 'card-pending' },
    { key: 'in_progress', label: 'In Progress', icon: 'ti-settings', class: 'card-progress' },
    { key: 'solved', label: 'Solved', icon: 'ti-check', class: 'card-solved' },
    { key: 'closed', label: 'Closed', icon: 'ti-lock', class: 'card-closed' },
  ];

  constructor() {
    this.dashboardService.getEmployeeSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[Dashboard] failed to load employee summary:', err);
        this.loading.set(false);
      },
    });
  }

  activityIcon(type: string): string {
    return type === 'message' ? 'ti-message-circle' : 'ti-refresh';
  }

  totalTickets(counts: Record<string, number>): number {
    return Object.values(counts).reduce((a, b) => a + b, 0);
  }
}
