import { Component, computed, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';
import { FormFieldsService } from '../../../core/services/form-fields-service';
import { TicketService } from '../../../core/services/ticket-service';
import { STATUS_CONFIG, Ticket, TicketStatus } from '../../../core/models/ticket.model';
import { FormField } from '../../../core/models/form-field.model';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { AttachementService } from '../../../core/services/attachement-service';
import { TicketChat } from '../ticket-chat/ticket-chat';
import { User } from '../../../core/models/user.model';
import { UserService } from '../../../core/services/user-service';
import { ReassignModal } from '../reassign-modal/reassign-modal';

@Component({
  selector: 'app-ticket-details',
  imports: [RouterLink, CommonModule, TicketChat, ReassignModal],
  templateUrl: './ticket-details.html',
  styleUrl: './ticket-details.scss',
})
export class TicketDetails {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ticketsService = inject(TicketService);
  private formFieldsService = inject(FormFieldsService);
  authService = inject(AuthService);
  private attachementService = inject(AttachementService);

  statusConfig = STATUS_CONFIG;

  ticket = signal<Ticket | null>(null);
  customFields = signal<FormField[]>([]);
  loading = signal(true);
  updating = signal(false);
  showChat = signal(false);
  showReassignModal = signal(false);

  users = signal<User[]>([]);

  availableStatuses = computed(() => {
    const t = this.ticket();
    const myId = this.authService.currentUser()?.id;

    if (!t || t.status === 'closed' || t.assignedAdminId !== myId) return [];

    const all: TicketStatus[] = ['raised', 'pending', 'in_progress', 'solved'];
    return all.filter((s) => s !== t.status);
  });

  canClose = computed(() => {
    const t = this.ticket();
    return !this.authService.isAdmin() && t?.status === 'solved';
  });

  canEdit = computed(() => {
    const t = this.ticket();
    return !this.authService.isAdmin() && t?.status === 'raised';
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/']);
      return;
    }
    this.formFieldsService
      .findAllActiveFormFields()
      .subscribe((fields) => this.customFields.set(fields));
    this.loadTicket(id);
  }

  private loadTicket(id: string) {
    this.loading.set(true);
    this.ticketsService.findOne(id).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Not found',
          text: 'This ticket does not exist or you do not have access to it.',
        }).then(() =>
          this.router.navigate([this.authService.isAdmin() ? '/tickets' : '/my-tickets']),
        );
      },
    });
  }

  changeStatus(newStatus: TicketStatus) {
    const t = this.ticket();
    if (!t) return;

    Swal.fire({
      title: `Mark as ${this.statusConfig[newStatus].label}?`,
      text: 'The employee will see this update on their ticket.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, update',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.updating.set(true);
      this.ticketsService.updateStatus(t.id, newStatus).subscribe({
        next: () => {
          this.updating.set(false);
          Swal.fire({
            icon: 'success',
            title: 'Status updated',
            timer: 1200,
            showConfirmButton: false,
          });
          this.loadTicket(t.id);
        },
        error: (err) => {
          this.updating.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.error?.message || 'Something went wrong',
          });
        },
      });
    });
  }

  closeTicket() {
    const t = this.ticket();
    if (!t) return;

    Swal.fire({
      title: 'Close this ticket?',
      text: 'Once closed, this ticket cannot be reopened. If the issue comes back, you will need to raise a new ticket.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, close ticket',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.updating.set(true);
      this.ticketsService.close(t.id).subscribe({
        next: () => {
          this.updating.set(false);
          Swal.fire({
            icon: 'success',
            title: 'Ticket closed',
            timer: 1400,
            showConfirmButton: false,
          });
          this.loadTicket(t.id);
        },
        error: (err) => {
          this.updating.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.error?.message || 'Something went wrong',
          });
        },
      });
    });
  }

  // matches a saved answer back to its field definition so we can show the label
  customFieldAnswers() {
    const values = this.ticket()?.customFieldValues;
    if (!values) return [];

    return this.customFields()
      .map((field) => ({ label: field.label, value: this.formatAnswer(values[field.id]) }))
      .filter((entry) => entry.value !== '');
  }

  private formatAnswer(value: any): string {
    if (value === undefined || value === null || value === '') return '';
    if (Array.isArray(value)) return value.join(', '); // checkbox answers
    return String(value);
  }

  statusLabel(status: TicketStatus) {
    return this.statusConfig[status].label;
  }
  statusClass(status: TicketStatus) {
    return this.statusConfig[status].class;
  }

  attachmentDownloadUrl(ticketId: string, attachmentId: string): string {
    return this.attachementService.downloadUrl(ticketId, attachmentId);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  attachmentViewUrl(ticketId: string, attachmentId: string): string {
    return this.attachementService.viewUrl(ticketId, attachmentId);
  }

  openInNewTab(url: string) {
    window.open(url, '_blank');
  }

  openChat() {
    this.showChat.set(true);
    const current = this.ticket();
    if (current) this.ticket.set({ ...current, unreadMessageCount: 0 });
  }

  claim(ticketId: string) {
    this.ticketsService.claim(ticketId).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Ticket assigned to you',
          timer: 1200,
          showConfirmButton: false,
        });
        this.loadTicket(ticketId);
      },
      error: (err) =>
        Swal.fire({ icon: 'error', title: 'Could not assign', text: err.error?.message }),
    });
  }

  async openReassign() {
    this.showReassignModal.set(true);
  }

  onReassignClosed(refresh: boolean) {
    this.showReassignModal.set(false);
    if (refresh) {
      Swal.fire({
        icon: 'success',
        title: 'Ticket reassigned',
        timer: 1200,
        showConfirmButton: false,
      });
      const t = this.ticket();
      if (t) this.loadTicket(t.id);
    }
  }
}
