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
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-raise-ticket',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './raise-ticket.html',
  styleUrl: './raise-ticket.scss',
})
export class RaiseTicket {
  private fb = inject(FormBuilder);
  private ticketService = inject(TicketService);
  private issueTypeService = inject(IssueTypesService);
  private formFieldService = inject(FormFieldsService);
  private router = inject(Router);

  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  issueTypes = signal<IssueType[]>([]);
  customFields = signal<FormField[]>([]);

  form: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', Validators.required],
    issueTypeId: [null, Validators.required],
    priority: ['low', Validators.required],
    phoneNumber: ['', Validators.required],
  });

  customForm: FormGroup = this.fb.group({});

  constructor() {
    forkJoin({
      issueTypes: this.issueTypeService.findAllActive(),
      fields: this.formFieldService.findAllActiveFormFields(),
    }).subscribe({
      next: ({ issueTypes, fields }) => {
        this.issueTypes.set(issueTypes);
        this.customFields.set(fields);
        this.buildCustomForm(fields);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load the ticket form. Please refresh and try again.');
        this.isLoading.set(false);
      },
    });
  }

  private buildCustomForm(fields: FormField[]) {
    const group: Record<string, any> = {};

    for (const field of fields) {
      const validators = field.isRequired ? [Validators.required] : [];

      if (field.fieldType === 'checkbox') {
        group[field.id] = this.fb.control([], validators);
      } else {
        group[field.id] = this.fb.control('', validators);
      }
    }
    this.customForm = this.fb.group(group);
  }

  toggleCheckBoxOption(fieldId: number, option: string) {
    const control = this.customForm.get(String(fieldId));
    if (!control) return;
    const current: string[] = control.value ?? [];
    const updated = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    control.setValue(updated);
  }

  isCheckBoxSelected(fieldId: number, option: string): boolean {
    const value: string[] = this.customForm.get(String(fieldId))?.value ?? [];
    return value.includes(option);
  }

  submit() {
    if (this.form.invalid || this.customForm.invalid) {
      this.form.markAllAsTouched();
      this.customForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload = {
      ...this.form.getRawValue(),
      issueTypeId: Number(this.form.value.issueTypeId),
      customFieldValues: this.customForm.getRawValue(),
    };

    this.ticketService.create(payload).subscribe({
      next: (ticket) => {
        this.isSubmitting.set(false);
        Swal.fire({
          icon: 'success',
          title: 'Ticket raised',
          text: `Your ticket number is ${ticket.ticketNumber}. Our IT team will get back to us shortly.`,
          confirmButtonColor: '#0ea5e9',
        }).then(() => this.router.navigate(['/my-tickets']));
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(
          err.error?.message || 'Could not raise the ticket. Please try again.',
        );
      },
    });
  }

  isInvalid(formGroup: FormGroup, controlName: string): boolean {
    const control = formGroup.get(controlName);
    return !!control && control.invalid && control.touched;
  }
}
