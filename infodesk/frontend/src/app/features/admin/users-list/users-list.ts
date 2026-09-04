import { Component, effect, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user-service';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { User } from '../../../core/models/user.model';
import { DatePipe } from '@angular/common';
import { UserFormModal } from '../user-form-modal/user-form-modal';

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
  sortField = signal<'name' | 'createdAt'>('createdAt');
  sortDir = signal<'asc' | 'desc'>('desc');

  users = signal<User[]>([]);
  total = signal(0);
  totalPages = signal(0);
  loading = signal(false);

  showModal = signal(false);
  editingUser = signal<User | null>(null);

  constructor() {
    effect(() => {
      this.fetch(this.page(), this.limit(), this.search(), this.roleFilter());
    });
  }

  private fetch(page: number, limit: number, search: string, role: string) {
    this.loading.set(false);
    this.userService.findAllUsers({ page, limit, search, role: role || undefined }).subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  sortBy(field: 'name' | 'createdAt') {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
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
    if (!confirm(`Deactivate ${user.name}? They will no longer be able to log in.`)) return;
    this.userService
      .deactivate(user.id)
      .subscribe(() => this.fetch(this.page(), this.limit(), this.search(), this.roleFilter()));
  }

  onModalClosed(refresh: boolean) {
    this.showModal.set(false);
    if (refresh) this.fetch(this.page(), this.limit(), this.search(), this.roleFilter());
  }
}
