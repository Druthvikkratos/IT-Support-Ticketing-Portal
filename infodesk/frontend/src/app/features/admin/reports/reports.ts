import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../../core/services/report-service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reports',
  imports: [FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports {
  private reportsService = inject(ReportService);

  dateFrom = '';
  dateTo = '';
  generating = signal(false);

  applyPreset(preset: 'today' | '7days' | '30days' | 'thisMonth' | 'all') {
    const today = new Date();
    const format = (d: Date) => d.toISOString().split('T')[0];

    switch (preset) {
      case 'today':
        this.dateFrom = format(today);
        this.dateTo = format(today);
        break;
      case '7days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 6);
        this.dateFrom = format(start);
        this.dateTo = format(today);
        break;
      }
      case '30days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 29);
        this.dateFrom = format(start);
        this.dateTo = format(today);
        break;
      }
      case 'thisMonth': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        this.dateFrom = format(start);
        this.dateTo = format(today);
        break;
      }
      case 'all':
        this.dateFrom = '';
        this.dateTo = '';
        break;
    }
  }

  generate() {
    if (this.dateFrom && this.dateTo && this.dateFrom > this.dateTo) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid range',
        text: 'Start date must be before end date.',
      });
      return;
    }

    this.generating.set(true);

    this.reportsService
      .downloadTicketReport(this.dateFrom || undefined, this.dateTo || undefined)
      .subscribe({
        next: (blob) => {
          this.generating.set(false);

          // trigger a real browser download from the blob response
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `InfoDesk-Ticket-Report-${new Date().toISOString().split('T')[0]}.xlsx`;
          link.click();
          window.URL.revokeObjectURL(url);

          Swal.fire({
            icon: 'success',
            title: 'Report downloaded',
            timer: 1400,
            showConfirmButton: false,
          });
        },
        error: (err) => {
          this.generating.set(false);
          console.error('[Reports] generation failed:', err);
          Swal.fire({
            icon: 'error',
            title: 'Could not generate report',
            text: 'Please try again.',
          });
        },
      });
  }
}
