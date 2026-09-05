import { Component, effect, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IssueTypeFormModal } from './issue-type-form-modal/issue-type-form-modal';
import { IssueTypesService } from '../../../core/services/issue-types';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IssueType } from '../../../core/models/issue-type.model';
import Swal from 'sweetalert2';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-issue-types-list',
  imports: [ReactiveFormsModule, IssueTypeFormModal, DatePipe],
  templateUrl: './issue-types-list.html',
  styleUrl: './issue-types-list.scss',
})
export class IssueTypesList {
  private issueTypesService = inject(IssueTypesService);

  searchControl = new FormControl('', { nonNullable: true });
  search = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(400), distinctUntilChanged()),
    { initialValue: '' },
  );

  page = signal(1);
  limit = signal(10);
  statusFilter = signal<'true' | 'false'>('true');
  sortField = signal<string | null>('name');
  sortDir = signal<'asc' | 'desc' | null>('asc');

  issueTypes = signal<IssueType[]>([]);
  total = signal(0);
  totalPages = signal(0);
  loading = signal(false);

  showModal = signal(false);
  editingIssueType = signal<IssueType | null>(null);

  constructor() {
    effect(() => {
      this.fetch(this.page(), this.limit(), this.search(), this.statusFilter(), this.sortField(), this.sortDir());
    });
  }

  private fetch(page: number, limit: number, search: string, status: string, sortField: string | null, sortDir: string | null) {
    this.loading.set(true);
    this.issueTypesService
      .findAllForAdmin({
        page, limit, search,
        isActive: status === 'true',
        sortField: sortField ?? undefined,
        sortDir: sortDir ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.issueTypes.set(res.data);
          this.total.set(res.total);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

 sortBy(field: string) {
  if (this.sortField() !== field) {
    // clicking a different column — start fresh at ascending
    this.sortField.set(field);
    this.sortDir.set('asc');
  } else if (this.sortDir() === 'asc') {
    // 2nd click on the same column — descending
    this.sortDir.set('desc');
  } else {
    // 3rd click — reset to no sort (backend falls back to its own default)
    this.sortField.set(null);
    this.sortDir.set(null);
  }
  this.page.set(1);
}

  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages()) this.page.set(p);
  }

  openCreate() {
    this.editingIssueType.set(null);
    this.showModal.set(true);
  }

  openEdit(issueType: IssueType) {
    this.editingIssueType.set(issueType);
    this.showModal.set(true);
  }

  toggleActive(issueType: IssueType) {
    const action = issueType.isActive ? 'deactivate' : 'reactivate';
    Swal.fire({
      title: `${action === 'deactivate' ? 'Deactivate' : 'Reactivate'} "${issueType.name}"?`,
      text: action === 'deactivate'
        ? 'Employees will no longer see this option when raising a ticket.'
        : 'This will reappear in the ticket form dropdown.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: `Yes, ${action}`,
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.issueTypesService.toggleActive(issueType.id).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Updated', timer: 1200, showConfirmButton: false });
          this.fetch(this.page(), this.limit(), this.search(), this.statusFilter(), this.sortField(), this.sortDir());
        },
        error: (err) => Swal.fire({ icon: 'error', title: 'Error', text: err.error?.message || 'Something went wrong' }),
      });
    });
  }

  onModalClosed(refresh: boolean) {
    this.showModal.set(false);
    if (refresh) this.fetch(this.page(), this.limit(), this.search(), this.statusFilter(), this.sortField(), this.sortDir());
  }

}
