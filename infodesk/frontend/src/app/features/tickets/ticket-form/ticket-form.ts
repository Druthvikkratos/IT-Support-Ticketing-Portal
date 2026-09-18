import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateTicketPayload, Ticket } from '../../../core/models/ticket.model';
import { FormFieldsService } from '../../../core/services/form-fields-service';
import { IssueTypesService } from '../../../core/services/issue-types';
import { IssueType } from '../../../core/models/issue-type.model';
import { FormField } from '../../../core/models/form-field.model';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-ticket-form',
  imports: [ReactiveFormsModule],
  templateUrl: './ticket-form.html',
  styleUrl: './ticket-form.scss',
})
export class TicketForm {
  @Input() existingTicket: Ticket | null = null;
  @Input() submitting = false;
  @Input() submitLabel = 'Submit Ticket';

  @Output() formSubmit = new EventEmitter<CreateTicketPayload>();

  private fb = inject(FormBuilder);
  private issueTypeService = inject(IssueTypesService);
  private formFieldService = inject(FormFieldsService);

  loading = signal(true);
  loadError = signal<string | null>(null);

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
        if (this.existingTicket) {
          this.patchExistingValues(this.existingTicket);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load the ticket form. Please refresh and try again.');
        this.loading.set(false);
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

  private patchExistingValues(ticket: Ticket) {
    this.form.patchValue({
      title: ticket.title,
      description: ticket.description,
      issueTypeId: ticket.issueTypeId,
      priority: ticket.priority,
      phoneNumber: ticket.phoneNumber,
    });

    const saved = ticket.customFieldValues ?? {};
    for (const field of this.customFields()) {
      const answer = saved[field.id];
      if (answer !== undefined && answer !== null) {
        this.customForm.get(String(field.id))?.setValue(answer);
      }
    }
  }

  toggleCheckboxOption(fieldId: number, option: string) {
    const control = this.customForm.get(String(fieldId));
    if (!control) return;
    const current: string[] = control.value ?? [];
    control.setValue(
      current.includes(option) ? current.filter((o) => o !== option) : [...current, option],
    );
  }

  isCheckboxSelected(fieldId: number, option: string): boolean {
    const value: string[] = this.customForm.get(String(fieldId))?.value ?? [];
    return value.includes(option);
  }

  submit() {
    if (this.form.invalid || this.customForm.invalid) {
      this.form.markAllAsTouched();
      this.customForm.markAllAsTouched();
      return;
    }

    this.formSubmit.emit({
      ...this.form.getRawValue(),
      issueTypeId: Number(this.form.value.issueTypeId),
      customFieldValues: this.customForm.getRawValue(),
    });
  }

  isInvalid(formGroup: FormGroup, controlName: string): boolean {
    const control = formGroup.get(controlName);
    return !!control && control.invalid && control.touched;
  }
}
