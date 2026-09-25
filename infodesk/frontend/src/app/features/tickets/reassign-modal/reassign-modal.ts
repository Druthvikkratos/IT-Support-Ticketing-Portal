import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminOption, UserService, UsersQuery } from '../../../core/services/user-service';
import { TicketService } from '../../../core/services/ticket-service';
import { AuthService } from '../../../core/services/auth-service';

@Component({
  selector: 'app-reassign-modal',
  imports: [FormsModule],
  templateUrl: './reassign-modal.html',
  styleUrl: './reassign-modal.scss',
})
export class ReassignModal {
  @Input({ required: true }) ticketId!: string;
  @Output() closed = new EventEmitter<boolean>();

  private userService = inject(UserService);
  private ticketService = inject(TicketService);
  private authService = inject(AuthService);

  admins = signal<AdminOption[]>([]);
  loading = signal(true);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  selectedAdminId = '';

  constructor() {
    const query: UsersQuery = {
      page: 1,
      limit: 10,
      search: '',
      role: 'admin',
      isActive: true
    };
    this.userService.findAllUsers(query).subscribe({
      next: (res) => {
        const myId = this.authService.currentUser()?.id;
        this.admins.set(res.data.filter((a) => a.id !== myId));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[Reassign] failed to load admins:', err);
        this.errorMessage.set('Could not load the list of admins.');
        this.loading.set(false);
      },
    });
  }

  submit() {
    if (!this.selectedAdminId) return;
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.ticketService.reassign(this.ticketId, this.selectedAdminId).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closed.emit(true);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message || 'Could not reassign this ticket.');
      },
    });
  }

  close() {
    this.closed.emit(false);
  }
}
