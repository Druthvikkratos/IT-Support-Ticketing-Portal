import { Component, effect, inject, signal } from '@angular/core';
import { TicketService } from '../../../core/services/ticket-service';
import { IssueTypesService } from '../../../core/services/issue-types';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { STATUS_CONFIG, Ticket, TicketStatus } from '../../../core/models/ticket.model';
import { IssueType } from '../../../core/models/issue-type.model';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-all-tickets',
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './all-tickets.html',
  styleUrl: './all-tickets.scss',
})
export class AllTickets {
  private ticketsService = inject(TicketService);
  private issueTypesService = inject(IssueTypesService);

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
  issueTypes = signal<IssueType[]>([]);
  issueTypeFilter = signal<string>('');

  total = signal(0);
  totalPages = signal(0);
  loading = signal(false);

  constructor() {
    this.issueTypesService.findAllActive().subscribe((types) => this.issueTypes.set(types));

    effect(() => {
      this.fetch(
        this.page(),
        this.limit(),
        this.search(),
        this.statusFilter(),
        this.priorityFilter(),
        this.issueTypeFilter(),
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
    issueTypeId: string,
    sortField: string | null,
    sortDir: string | null,
  ) {
    this.loading.set(true);
    this.ticketsService
      .findAll({
        page,
        limit,
        search,
        status: status || undefined,
        priority: priority || undefined,
        issueTypeId: issueTypeId ? Number(issueTypeId) : undefined,
        sortField: sortField ?? undefined,
        sortDir: sortDir ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.tickets.set(res.data);
          console.log("logs", this.tickets()[0].rasiedBy.name)
          this.total.set(res.total);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
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
}
