import { Component, effect, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TicketService } from '../../../core/services/ticket-service';
import { STATUS_CONFIG, Ticket, TicketStatus } from '../../../core/models/ticket.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-my-tickets',
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './my-tickets.html',
  styleUrl: './my-tickets.scss',
})
export class MyTickets {
  private ticketService = inject(TicketService);
  private router = inject(Router);

  statusConfig = STATUS_CONFIG;
  statusTabs: { value: string; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'raised', label: 'Raised' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'solved', label: 'Solved' },
    { value: 'closed', label: 'Closed' },
  ];

  searchControl = new FormControl('', { nonNullable: true });
  search = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(400), distinctUntilChanged()),
    { initialValue: '' },
  );
  page = signal(1);
  limit = signal(10);
  statusFilter = signal('');
  priorityFilter = signal('');
  sortField = signal<string | null>('createdAt');
  sortDir = signal<'asc' | 'desc' | null>('desc');

  tickets = signal<Ticket[]>([]);
  total = signal(0);
  totalPages = signal(0);
  loading = signal(false);

  constructor() {
    effect(() => {
      this.fetch(
        this.page(),
        this.limit(),
        this.search(),
        this.statusFilter(),
        this.priorityFilter(),
        this.sortField(),
        this.sortDir(),
      );
    });
  }

  private fetch(
    page: number,
    limit: number,
    search: string,
    status: string,
    priority: string,
    sortField: string | null,
    sortDir: string | null,
  ) {
    this.loading.set(true);
    this.ticketService
      .findMine({
        page,
        limit,
        search,
        status: status || undefined,
        priority: priority || undefined,
        sortField: sortField || undefined,
        sortDir: sortDir || undefined,
      })
      .subscribe({
        next: (res) => {
          this.tickets.set(res.data);
          this.total.set(res.total);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  selectStatusTab(status: string) {
    this.statusFilter.set(status);
    this.page.set(1);
  }

  sortBy(field: string) {
    if (this.sortField() != field) {
      this.sortField.set(field);
      this.sortDir.set('asc');
    } else if (this.sortDir() === 'asc') {
      this.sortDir.set('desc');
    } else {
      this.sortField.set(null);
      this.sortDir.set(null);
    }
    this.page.set(1);
  }

  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages()) this.page.set(p);
  }

  statusLabel(status: TicketStatus) {
    return this.statusConfig[status].label;
  }
  statusClass(status: TicketStatus) {
    return this.statusConfig[status].class;
  }

  viewTicket(id: string) {
    this.router.navigate(['/tickets', id]);
  }
}
