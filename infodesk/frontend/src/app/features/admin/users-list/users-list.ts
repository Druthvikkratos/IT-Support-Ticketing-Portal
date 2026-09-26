import { Component, effect, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user-service';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { User } from '../../../core/models/user.model';
import { DatePipe } from '@angular/common';
import { UserFormModal } from '../user-form-modal/user-form-modal';
import Swal from 'sweetalert2';
import { BulkUploadModal } from '../bulk-upload-modal/bulk-upload-modal';

@Component({
  selector: 'app-users-list',
  imports: [ReactiveFormsModule, DatePipe, UserFormModal, BulkUploadModal],
  templateUrl: './users-list.html',
  styleUrl: './users-list.scss',
})
export class UsersList {
  private userService = inject(UserService);

  searchControl = new FormControl('', { nonNullable: true });
  search = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(400), distinctUntilChanged()),
    { initialValue: '' },
  );

  page = signal(1);
  limit = signal(10);
  roleFilter = signal<string>('');
  sortField = signal<'name' | 'createdAt' | null>(null);
  sortDir = signal<'asc' | 'desc'>('asc');

  users = signal<User[]>([]);
  total = signal(0);
  totalPages = signal(0);
  loading = signal(false);

  showModal = signal(false);
  editingUser = signal<User | null>(null);
  statusFilter = signal<'true' | 'false'>('true');
  showBulkUploadModal = signal(false);

  constructor() {
    effect(() => {
      this.fetch(
        this.page(),
        this.limit(),
        this.search(),
        this.roleFilter(),
        this.statusFilter(),
        this.sortField(),
        this.sortDir(),
      );
    });
  }

  private fetch(
    page: number,
    limit: number,
    search: string,
    role: string,
    status: string,
    sortField: string | null,
    sortDir: string,
  ) {
    this.loading.set(true);
    this.userService
      .findAllUsers({
        page,
        limit,
        search,
        role: role || undefined,
        isActive: status === 'true',
        sortField: sortField ?? undefined,
        sortDir,
      })
      .subscribe({
        next: (res) => {
          this.users.set(res.data);
          this.total.set(res.total);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages()) this.page.set(p);
  }

  openCreate() {
    this.editingUser.set(null);
    this.showModal.set(true);
  }

  openEdit(user: User) {
    this.editingUser.set(user);
    this.showModal.set(true);
  }

  deactivate(user: User) {
    Swal.fire({
      title: `Deactivate ${user.name}?`,
      text: 'They will no longer be able to log in. This does not delete their data or ticket history.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, deactivate',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.userService.deactivate(user.id).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Deactivated',
            timer: 1400,
            showConfirmButton: false,
          });
          this.fetch(
            this.page(),
            this.limit(),
            this.search(),
            this.roleFilter(),
            this.statusFilter(),
            this.sortField(),
            this.sortDir(),
          );
        },
        error: (err) =>
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.error?.message || 'Something went wrong',
          }),
      });
    });
  }

  onModalClosed(refresh: boolean) {
    this.showModal.set(false);
    if (refresh)
      this.fetch(
        this.page(),
        this.limit(),
        this.search(),
        this.roleFilter(),
        this.statusFilter(),
        this.sortField(),
        this.sortDir(),
      );
  }

  sortBy(field: 'name' | 'createdAt') {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
    this.page.set(1);
  }

  sortIcon(field: 'name' | 'createdAt'): string {
    if (this.sortField() !== field) return 'ti-arrows-sort';
    return this.sortDir() === 'asc' ? 'ti-sort-ascending' : 'ti-sort-descending';
  }

  toggleStatus(user: User) {
    const activating = !user.isActive;

    Swal.fire({
      title: `${activating ? 'Reactivate' : 'Deactivate'} ${user.name}?`,
      text: activating
        ? 'They will be able to log in again with their existing credentials.'
        : 'They will no longer be able to log in. Their ticket history stays intact.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: `Yes, ${activating ? 'reactivate' : 'deactivate'}`,
    }).then((result) => {
      if (!result.isConfirmed) return;

      const request$ = activating
        ? this.userService.reactivate(user.id)
        : this.userService.deactivate(user.id);

      request$.subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Updated', timer: 1200, showConfirmButton: false });
          this.fetch(
            this.page(),
            this.limit(),
            this.search(),
            this.roleFilter(),
            this.statusFilter(),
            this.sortField(),
            this.sortDir(),
          );
        },
        error: (err) =>
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.error?.message || 'Something went wrong',
          }),
      });
    });
  }

  onBulkUploadClosed(refresh: boolean) {
    this.showBulkUploadModal.set(false);
    if (refresh)
      this.fetch(
        this.page(),
        this.limit(),
        this.search(),
        this.roleFilter(),
        this.statusFilter(),
        this.sortField(),
        this.sortDir(),
      );
  }

  permanentDelete(user: User) {
    if (user.role !== 'employee') return;
    Swal.fire({
      title: `Permanently delete ${user.name}?`,
      html: `This <strong>cannot be undone</strong>. All of their tickets, chat messages, attachments, and notification history will be permanently erased.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, delete permanently',
      input: 'text',
      inputPlaceholder: `Type "${user.name}" to confirm`,
      inputValidator: (value) => (value !== user.name ? 'Name does not match' : undefined),
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.userService.permanentDelete(user.id).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Deleted', timer: 1400, showConfirmButton: false });
          this.fetch(
            this.page(),
            this.limit(),
            this.search(),
            this.roleFilter(),
            this.statusFilter(),
            this.sortField(),
            this.sortDir(),
          );
        },
        error: (err: any) =>
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.error?.message || 'Could not delete this user',
          }),
      });
    });
  }
}
