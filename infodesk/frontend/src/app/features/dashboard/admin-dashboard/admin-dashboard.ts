import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { DashboardService } from '../../../core/services/dashboard-service';
import { AdminDashboardSummary } from '../../../core/models/dashboard.model';

Chart.register(...registerables)

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, RelativeTimePipe],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard {
  @ViewChild('trendCanvas') trendCanvas?: ElementRef<HTMLCanvasElement>

  private dashboardService = inject(DashboardService)

  summary = signal<AdminDashboardSummary | null>(null)
  loading = signal(true)
  private chart?: Chart
  
  statusCards = [
    { key: 'raised', label: 'Raised', icon: 'ti-flag', class: 'card-raised' },
    { key: 'pending', label: 'Pending', icon: 'ti-clock', class: 'card-pending' },
    { key: 'in_progress', label: 'In Progress', icon: 'ti-settings', class: 'card-progress' },
    { key: 'solved', label: 'Solved', icon: 'ti-check', class: 'card-solved' },
    { key: 'closed', label: 'Closed', icon: 'ti-lock', class: 'card-closed' },
  ];

  ngAfterViewInit(){
    this.dashboardService.getAdminSummary().subscribe({
      next: (summmary) => {
        this.summary.set(summmary)
        this.loading.set(false)
        setTimeout(() => this.renderChart(summmary.trend), 0);
      },
      error: (err) => {
         console.error('[Dashboard] failed to load admin summary:', err);
        this.loading.set(false);
      }
    })
  }

  private renderChart(trend: { date: string; count: number }[]) {
    if (!this.trendCanvas) return;

    this.chart = new Chart(this.trendCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: trend.map((t) => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          label: 'Tickets Raised',
          data: trend.map((t) => t.count),
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#0ea5e9',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  activityIcon(type: string): string {
    return type === 'message' ? 'ti-message-circle' : 'ti-refresh';
  }
  
}
