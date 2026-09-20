import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateTicketPayload, Ticket } from '../../../core/models/ticket.model';
import { FormFieldsService } from '../../../core/services/form-fields-service';
import { IssueTypesService } from '../../../core/services/issue-types';
import { IssueType } from '../../../core/models/issue-type.model';
import { FormField } from '../../../core/models/form-field.model';
import { forkJoin } from 'rxjs';
import { AttachementService } from '../../../core/services/attachement-service';
import { HttpEventType } from '@angular/common/http';
import Swal from 'sweetalert2';
import { FRONTEND_FILE_CATEGORIES } from '../../../core/constants/file-categories';

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
  private attachementService = inject(AttachementService);

  loading = signal(true);
  loadError = signal<string | null>(null);

  issueTypes = signal<IssueType[]>([]);
  customFields = signal<FormField[]>([]);

  form: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', Validators.required],
    issueTypeId: [null, Validators.required],
    priority: ['low', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
  });

  customForm: FormGroup = this.fb.group({});

  selectedFiles = signal<Record<number, File[]>>({});
  uploadProgress = signal<Record<number, number>>({});
  fileErrors = signal<Record<number, string>>({});

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
      if (field.fieldType === 'file') continue; // file fields are tracked separately via selectedFiles, not as form controls

      const validators = field.isRequired ? [Validators.required] : [];
      if (field.fieldType === 'phone') validators.push(Validators.pattern(/^\d{10}$/));
      if (field.fieldType === 'email') validators.push(Validators.email);

      group[field.id] =
        field.fieldType === 'checkbox'
          ? this.fb.control([], validators)
          : this.fb.control('', validators);
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
      if (field.fieldType === 'file') continue;
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

    // manually validate required file fields — these aren't part of customForm
    for (const field of this.customFields()) {
      if (field.fieldType === 'file' && field.isRequired) {
        const files = this.selectedFiles()[field.id] ?? [];
        if (files.length === 0) {
          this.fileErrors.update((errs) => ({
            ...errs,
            [field.id]: `${field.label} is required.`,
          }));
          return;
        }
      }
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

  onFilesSelected(fieldId: number, event: Event, inputEl: HTMLInputElement) {
    const files = inputEl.files ? Array.from(inputEl.files) : [];
    if (files.length === 0) return;

    const field = this.customFields().find((f) => f.id === fieldId);
    const config = field?.fileConfig;

    this.fileErrors.update((errs) => ({ ...errs, [fieldId]: '' }));
    if (!config) {
      inputEl.value = '';
      return;
    }
    if (!config.allowMultiple && files.length > 1) {
      Swal.fire({
        icon: 'error',
        title: 'Only one file allowed',
        text: `"${field!.label}" only accepts a single file.`,
      });
      inputEl.value = '';
      return;
    }
    const allowedMimeTypes = config.allowedCategories.flatMap(
      (cat) => FRONTEND_FILE_CATEGORIES[cat]?.mimeTypes ?? [],
    );
    const allowedLabels = config.allowedCategories
      .map((cat) => FRONTEND_FILE_CATEGORIES[cat]?.label ?? cat)
      .join(', ');
    const invalidTypeFile = files.find((f) => !allowedMimeTypes.includes(f.type));
    if (invalidTypeFile) {
      Swal.fire({
        icon: 'error',
        title: 'File type not allowed',
        text: `"${invalidTypeFile.name}" is not an accepted file type for "${field!.label}". Only ${allowedLabels} are allowed.`,
      });
      inputEl.value = ''; // reject the WHOLE selection, not just the bad file — avoids a half-accepted batch
      return;
    }
    const maxBytes = config.maxSizeMB * 1024 * 1024;
    const oversizedFile = files.find((f) => f.size > maxBytes);
    if (oversizedFile) {
      Swal.fire({
        icon: 'error',
        title: 'File too large',
        text: `"${oversizedFile.name}" is ${(oversizedFile.size / 1024 / 1024).toFixed(1)}MB, which exceeds the ${config.maxSizeMB}MB limit.`,
      });
      inputEl.value = '';
      return;
    }
    this.selectedFiles.update((current) => ({ ...current, [fieldId]: files }));
  }

  removeSelectedFile(fieldId: number, index: number, inputEl?: HTMLInputElement) {
    this.selectedFiles.update((current) => {
      const updated = [...(current[fieldId] ?? [])];
      updated.splice(index, 1);
      return { ...current, [fieldId]: updated };
    });
    if (inputEl) {
      inputEl.value = '';
    }
  }

  async uploadPendingFiles(ticketId: string): Promise<void> {
    const entries = Object.entries(this.selectedFiles()).filter(([, files]) => files.length > 0);
    if (entries.length === 0) return Promise.resolve();

    const uploads = entries.map(([fieldIdStr, files]) => {
      const fieldId = Number(fieldIdStr);
      return new Promise<void>((resolve, reject) => {
        this.attachementService.upload(ticketId, fieldId, files).subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              const percent = Math.round((event.loaded / event.total) * 100);
              this.uploadProgress.update((p) => ({ ...p, [fieldId]: percent }));
            }
            if (event.type === HttpEventType.Response) resolve();
          },
          error: (err) => {
            this.fileErrors.update((errs) => ({
              ...errs,
              [fieldId]:
                err.error?.message ||
                'File upload failed. The ticket was saved, but this file was not attached.',
            }));
            reject(err);
          },
        });
      });
    });
    await Promise.allSettled(uploads);
    return undefined;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  clearSelectedFiles(fieldId: number, inputEl?: HTMLInputElement) {
    this.selectedFiles.update((current) => ({ ...current, [fieldId]: [] }));
    this.fileErrors.update((errs) => ({ ...errs, [fieldId]: '' }));
    this.uploadProgress.update((p) => ({ ...p, [fieldId]: 0 }));
    if (inputEl) inputEl.value = '';
  }

  numericOnly(event: KeyboardEvent) {
    const allowed = /[0-9]/;
    if (!allowed.test(event.key)) {
      event.preventDefault(); // blocks the keystroke from ever appearing — matches what you meant by "it should not even take it in the input"
    }
  }

  fileButtonLabel(field: FormField): string {
    const hasFiles = (this.selectedFiles()[field.id]?.length ?? 0) > 0;
    const allowsMultiple = field.fileConfig?.allowMultiple ?? false;
    if (!hasFiles) {
      return allowsMultiple ? 'Choose Files' : 'Choose File';
    }
    return allowsMultiple ? 'Add More Files' : 'Replace File';
  }
}
