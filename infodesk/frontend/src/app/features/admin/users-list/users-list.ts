import { Component, effect, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user-service';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { User } from '../../../core/models/user.model';
import { DatePipe } from '@angular/common';
import { UserFormModal } from '../user-form-modal/user-form-modal';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-users-list',
  imports: [ReactiveFormsModule, DatePipe, UserFormModal],
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

  constructor() {
    effect(() => {
      this.fetch(this.page(), this.limit(), this.search(), this.roleFilter(), this.statusFilter(), this.sortField(), this.sortDir());
    });
  }

  private fetch(page: number, limit: number, search: string, role: string, status: string, sortField: string | null, sortDir: string) {
    this.loading.set(true);
    this.userService
      .findAllUsers({
        page,
        limit,
        search,
        role: role || undefined,
        isActive: status === 'true',
        sortField: sortField ?? undefined, sortDir
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
            this.sortDir()
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
      this.fetch(this.page(), this.limit(), this.search(), this.roleFilter(), this.statusFilter(), this.sortField(), this.sortDir());
  }

  sortBy(field: 'name' | 'createdAt') {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
    this.page.set(1)
  }

  sortIcon(field: 'name' | 'createdAt'): string {
    if (this.sortField() !== field) return 'ti-arrows-sort';
    return this.sortDir() === 'asc' ? 'ti-sort-ascending' : 'ti-sort-descending';
  }
}
