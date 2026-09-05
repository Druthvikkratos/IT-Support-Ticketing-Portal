import { Component, EventEmitter, inject, Input, Output, signal, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IssueType } from '../../../../core/models/issue-type.model';
import { IssueTypesService } from '../../../../core/services/issue-types';

@Component({
  selector: 'app-issue-type-form-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './issue-type-form-modal.html',
  styleUrl: './issue-type-form-modal.scss',
})
export class IssueTypeFormModal {
  @Input() editingIssueType: IssueType | null = null;
  @Output() closed = new EventEmitter<boolean>();

  private fb = inject(FormBuilder);
  private issueTypesService = inject(IssueTypesService);

  isEditMode = signal(false);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
  });

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['editingIssueType']) return;

    if (this.editingIssueType) {
      this.isEditMode.set(true);
      this.form.patchValue({ name: this.editingIssueType.name });
    } else {
      this.isEditMode.set(false);
      this.form.reset();
    }
  }

  submit() {
    this.errorMessage.set(null);
    this.submitting.set(true);

    const request$ = this.isEditMode() && this.editingIssueType
      ? this.issueTypesService.update(this.editingIssueType.id, this.form.value.name!)
      : this.issueTypesService.create(this.form.value.name!);

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
