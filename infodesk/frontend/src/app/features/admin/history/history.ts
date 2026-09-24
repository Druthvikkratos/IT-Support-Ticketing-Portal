import { Component, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { HistoryService } from '../../../core/services/history-service';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { HistoryActor, HistoryEvent } from '../../../core/models/history.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-history',
  imports: [ReactiveFormsModule, FormsModule, RouterLink, RelativeTimePipe, CommonModule],
  templateUrl: './history.html',
  styleUrl: './history.scss',
})
export class History {
  private historyService = inject(HistoryService);

  searchControl = new FormControl('', { nonNullable: true });
  search = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(400), distinctUntilChanged()),
    { initialValue: '' },
  );

  page = signal(1);
  limit = signal(20);
  typeFilter = signal('');
  actorFilter = signal('');
  dateFrom = '';
  dateTo = '';

  private dateTrigger = signal(0);

  events = signal<HistoryEvent[]>([]);
  actors = signal<HistoryActor[]>([]);
  total = signal(0);
  totalPages = signal(0);
  loading = signal(false);

  constructor() {
    this.historyService.getActors().subscribe((list) => this.actors.set(list));

    effect(() => {
      this.dateTrigger();
      this.fetch(this.page(), this.limit(), this.search(), this.typeFilter(), this.actorFilter());
    });
  }

  private fetch(page: number, limit: number, search: string, type: string, actorId: string) {
    this.loading.set(true);
    this.historyService
      .findAll({
        page,
        limit,
        search,
        type: type || undefined,
        actorId: actorId || undefined,
        dateFrom: this.dateFrom || undefined,
        dateTo: this.dateTo || undefined,
      })
      .subscribe({
        next: (res) => {
          this.events.set(res.data);
          this.total.set(res.total);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('[History] fetch failed:', err);
          this.loading.set(false);
        },
      });
  }

  applyDateFilter() {
    this.page.set(1);
    this.dateTrigger.update((v) => v + 1);
  }

  clearDateFilter() {
    this.dateFrom = '';
    this.dateTo = '';
    this.applyDateFilter();
  }

  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages()) this.page.set(p);
  }

  eventIcon(type: string): string {
    return type === 'message' ? 'ti-message-circle' : 'ti-refresh';
  }
}
