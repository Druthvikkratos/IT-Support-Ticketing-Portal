import {
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { FILE_CATEGORY_OPTIONS, FormField } from '../../../../core/models/form-field.model';
import { FormFieldsService } from '../../../../core/services/form-fields-service';

@Component({
  selector: 'app-form-field-form-modal',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './form-field-form-modal.html',
  styleUrl: './form-field-form-modal.scss',
})
export class FormFieldFormModal {
  @Input() editingField: FormField | null = null;
  @Output() closed = new EventEmitter<boolean>();

  private fb = inject(FormBuilder);
  private formFieldsService = inject(FormFieldsService);

  isEditMode = signal(false);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  options = signal<string[]>([]);
  optionInput = signal('');

  fieldTypes: { value: FormField['fieldType']; label: string }[] = [
    { value: 'text', label: 'Short Text' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'radio', label: 'Radio Buttons' },
    { value: 'checkbox', label: 'Checkboxes' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'email', label: 'Email' },
    { value: 'file', label: 'File Upload' },
  ];

  form = this.fb.nonNullable.group({
    label: ['', [Validators.required, Validators.maxLength(100)]],
    fieldType: ['text' as FormField['fieldType'], Validators.required],
    isRequired: [false],
  });

  selectedType = toSignal(this.form.controls.fieldType.valueChanges, {
    initialValue: 'text' as FormField['fieldType'],
  });
  needsOptions = computed(() => ['dropdown', 'radio', 'checkbox'].includes(this.selectedType()));
  needsFileConfig = computed(() => this.selectedType() === 'file');
  fileCategoryOptions = FILE_CATEGORY_OPTIONS;

  selectedCategories = signal<string[]>([]);
  allowMultiple = signal(false);
  maxSizeMB = signal(10);

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['editingField']) return;
    if (this.editingField) {
      this.isEditMode.set(true);
      this.form.patchValue({
        label: this.editingField.label,
        fieldType: this.editingField.fieldType,
        isRequired: this.editingField.isRequired,
      });
      this.options.set(this.editingField.options ?? []);
      if (this.editingField.fieldType === 'file' && this.editingField.fileConfig) {
        this.selectedCategories.set(this.editingField.fileConfig.allowedCategories ?? []);
        this.allowMultiple.set(this.editingField.fileConfig.allowMultiple ?? false);
        this.maxSizeMB.set(this.editingField.fileConfig.maxSizeMB ?? 10);
      } else {
        this.selectedCategories.set([]);
        this.allowMultiple.set(false);
        this.maxSizeMB.set(10);
      }
    } else {
      this.isEditMode.set(false);
      this.form.reset({
        label: '',
        fieldType: 'text',
        isRequired: false,
      });
      this.options.set([]);
      this.selectedCategories.set([]);
      this.allowMultiple.set(false);
      this.maxSizeMB.set(10);
    }
    this.optionInput.set('');
  }

  toggleCategory(value: string) {
    this.selectedCategories.update((cats) =>
      cats.includes(value) ? cats.filter((c) => c !== value) : [...cats, value],
    );
  }

  addOption() {
    const value = this.optionInput().trim();
    if (!value) return;
    if (this.options().includes(value)) {
      this.optionInput.set('');
      return;
    }
    this.options.update((opts) => [...opts, value]);
    this.optionInput.set('');
  }

  removeOption(option: string) {
    this.options.update((opts) => opts.filter((o) => o !== option));
  }

  submit() {
    this.errorMessage.set(null);

    if (this.needsOptions() && this.options().length === 0) {
      this.errorMessage.set('Add at least one option for this field type.');
      return;
    }
    if (this.needsFileConfig() && this.selectedCategories().length === 0) {
      this.errorMessage.set('Select at least one allowed file category.');
      return;
    }

    this.submitting.set(true);
    const payload = {
      ...this.form.getRawValue(),
      options: this.needsOptions() ? this.options() : undefined,
      fileConfig: this.needsFileConfig()
        ? {
            allowedCategories: this.selectedCategories(),
            allowMultiple: this.allowMultiple(),
            maxSizeMB: this.maxSizeMB(),
          }
        : undefined,
    };

    const request$ =
      this.isEditMode() && this.editingField
        ? this.formFieldsService.updateFormField(this.editingField.id, payload)
        : this.formFieldsService.createFormField(payload);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.closed.emit(true);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message || 'Something went wrong');
      },
    });
  }

  close() {
    this.closed.emit(false);
  }
}
