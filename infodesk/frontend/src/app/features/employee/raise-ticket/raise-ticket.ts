import { Component, inject, signal } from '@angular/core';
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

@Component({
  selector: 'app-raise-ticket',
  imports: [TicketForm],
  templateUrl: './raise-ticket.html',
  styleUrl: './raise-ticket.scss',
})
export class RaiseTicket {
  private ticketService = inject(TicketService);
  private router = inject(Router);
  private location = inject(Location);

  isSubmitting = signal(false);

  onSubmit(payload: CreateTicketPayload) {
    this.isSubmitting.set(true);
    this.ticketService.create(payload).subscribe({
      next: (ticket) => {
        this.isSubmitting.set(false);
        Swal.fire({
          icon: 'success',
          title: 'Ticket raised',
          text: `Your ticket number is ${ticket.ticketNumber}. Our IT team will get back to you shortly.`,
          confirmButtonColor: '#0ea5e9',
        }).then(() => this.router.navigate(['/my-tickets']));
      },
      error: (err) => {
        this.isSubmitting.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Could not raise ticket',
          text: err.error?.message || 'Please try again.',
        });
      },
    });
  }

  goBack(): void {
    this.location.back(); 
  }
}
