import { Component, EventEmitter, inject, Input, Output, signal, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { User } from '../../../core/models/user.model';
import { UserService } from '../../../core/services/user-service';

@Component({
  selector: 'app-user-form-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './user-form-modal.html',
  styleUrl: './user-form-modal.scss',
})
export class UserFormModal {
  @Input() editingUser: User | null = null;
  @Output() closed = new EventEmitter<boolean>();

  private fb = inject(FormBuilder);
  private userService = inject(UserService);

  role = signal<'admin' | 'employee'>('employee');
  isEditMode = signal(false);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  successInfo = signal<string | null>(null);

  adminForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  employeeForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    employeeCode: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    email: ['', [Validators.required, Validators.required]],
  });

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['editingUser']) return;

    if (this.editingUser) {
      // EDIT MODE — lock the role to whatever this user already is,
      // pre-fill the matching form, never show the other one
      this.isEditMode.set(true);
      this.role.set(this.editingUser.role);

      if (this.editingUser.role === 'admin') {
        this.adminForm.patchValue({ name: this.editingUser.name, email: this.editingUser.email });
        this.adminForm.get('password')?.clearValidators();
        this.adminForm.get('password')?.updateValueAndValidity();
      } else {
        this.employeeForm.patchValue({
          name: this.editingUser.name,
          email: this.editingUser.email,
          employeeCode: this.editingUser.employeeCode ?? '',
        });
        this.employeeForm.get('employeeCode')?.disable(); // login id — not editable
      }
    } else {
      // CREATE MODE — reset everything
      this.isEditMode.set(false);
      this.role.set('employee');
      this.adminForm.reset();
      this.adminForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
      this.adminForm.get('password')?.updateValueAndValidity();
      this.employeeForm.reset();
      this.employeeForm.get('employeeCode')?.enable();
    }
  }

  submit() {
    this.errorMessage.set(null);
    this.submitting.set(true);

    const request$ = this.isEditMode() && this.editingUser
      ? this.role() === 'admin'
        ? this.userService.updateAdmin(this.editingUser.id, this.adminForm.getRawValue())
        : this.userService.updateEmployee(this.editingUser.id, this.employeeForm.getRawValue())
      : this.role() === 'admin'
        ? this.userService.createAdmin(this.adminForm.getRawValue())
        : this.userService.createEmployee(this.employeeForm.getRawValue());

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.successInfo.set(
          this.isEditMode()
            ? 'User updated successfully.'
            : this.role() === 'employee'
              ? `Employee created. Login: info/${this.employeeForm.value.employeeCode}`
              : 'Admin created successfully.',
        );
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message || 'Something went wrong');
      },
    });
  }

  close(refresh: boolean) {
    this.closed.emit(refresh);
  }
}
