import { Component, inject, signal, ViewChild, viewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TicketService } from '../../../core/services/ticket-service';
import { IssueTypesService } from '../../../core/services/issue-types';
import { FormFieldsService } from '../../../core/services/form-fields-service';
import { Router } from '@angular/router';
import { IssueType } from '../../../core/models/issue-type.model';
import { FormField } from '../../../core/models/form-field.model';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { CommonModule, Location } from '@angular/common';
import { TicketForm } from '../../tickets/ticket-form/ticket-form';
import { CreateTicketPayload } from '../../../core/models/ticket.model';
import { ConnectivityService } from '../../../core/services/connectivity-service';
import { OutboxService } from '../../../core/services/outbox-service';

@Component({
  selector: 'app-raise-ticket',
  imports: [TicketForm],
  templateUrl: './raise-ticket.html',
  styleUrl: './raise-ticket.scss',
})
export class RaiseTicket {
  @ViewChild(TicketForm) ticketForm!: TicketForm;

  private ticketService = inject(TicketService);
  private connectivityService = inject(ConnectivityService);
  private outboxService = inject(OutboxService);
  private router = inject(Router);
  private location = inject(Location);

  isSubmitting = signal(false);

  async onSubmit(formPayload: CreateTicketPayload) {
    const payload = { ...formPayload, clientRequestId: this.outboxService.newId() };

    if (!this.connectivityService.serverReachable()) {
      await this.saveOffline(payload);
      return;
    }
    this.isSubmitting.set(true);
    this.ticketService.create(payload).subscribe({
      next: async (ticket) => {
        await this.ticketForm.uploadPendingFiles(ticket.id);
        this.isSubmitting.set(false);
        Swal.fire({
          icon: 'success',
          title: 'Ticket raised',
          text: `Your ticket number is ${ticket.ticketNumber}. Our IT team will get back to you shortly.`,
          confirmButtonColor: '#0ea5e9',
        }).then(() => this.router.navigate(['/my-tickets']));
        if (ticket.botStarted)
          this.router.navigate(['/tickets', ticket.id], { queryParams: { openChat: 1 } });
        else this.router.navigate(['/my-tickets']);
      },
      error: async (err) => {
        this.isSubmitting.set(false);
        if (err.status === 0) {
          await this.saveOffline(payload);
          return;
        }
        Swal.fire({
          icon: 'error',
          title: 'Could not raise ticket',
          text: err.error?.message || 'Please try again.',
        });
      },
    });
  }

  private async saveOffline(payload: CreateTicketPayload) {
    await this.outboxService.enqueue(payload, this.ticketForm.collectPendingFiles());
    this.ticketForm.resetForm();
    Swal.fire({
      icon: 'info',
      title: 'Saved on this device',
      text: 'You are offline. Your ticket will be sent automatically as soon as the connection is back.',
      confirmButtonColor: '#0ea5e9',
    });
  }

  goBack(): void {
    this.location.back();
  }
}
