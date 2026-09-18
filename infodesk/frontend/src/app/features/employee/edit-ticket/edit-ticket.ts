import { Component, inject, signal } from '@angular/core';
import { TicketForm } from '../../tickets/ticket-form/ticket-form';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TicketService } from '../../../core/services/ticket-service';
import { CreateTicketPayload, Ticket } from '../../../core/models/ticket.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-edit-ticket',
  imports: [TicketForm, RouterLink],
  templateUrl: './edit-ticket.html',
  styleUrl: './edit-ticket.scss',
})
export class EditTicket {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ticketsService = inject(TicketService);

  ticket = signal<Ticket | null>(null);
  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/my-tickets']);
      return;
    }
    this.ticketsService.findOne(id).subscribe({
      next: (ticket) => {
        if (ticket.status !== 'raised') {
          Swal.fire({
            icon: 'info',
            title: 'Cannot edit this ticket',
            text: 'Our IT team has already started working on it. Use the chat on the ticket to add more details instead.',
            confirmButtonColor: '#0ea5e9',
          }).then(() => this.router.navigate(['/tickets', ticket.id]));
          return;
        }
        this.ticket.set(ticket);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Not found',
          text: 'This ticket does not exist or you do not have access to it.',
        }).then(() => this.router.navigate(['/my-tickets']));
      },
    });
  }

  onSubmit(payload: CreateTicketPayload) {
    const t = this.ticket();
    if (!t) {
      return;
    }
    this.submitting.set(true);
    this.ticketsService.update(t.id, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        Swal.fire({
          icon: 'success',
          title: 'Ticket updated',
          timer: 1400,
          showConfirmButton: false,
        }).then(() => this.router.navigate(['/tickets', t.id]));
      },
      error: (err) => {
        this.submitting.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Could not update ticket',
          text: err.error?.message || 'Please try again.',
        });
      },
    });
  }
}
