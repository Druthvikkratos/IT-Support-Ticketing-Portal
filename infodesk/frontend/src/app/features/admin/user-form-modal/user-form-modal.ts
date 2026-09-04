import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
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

  submit() {
    this.errorMessage.set(null);
    this.submitting.set(true);

    const request$ =
      this.role() === 'admin'
        ? this.userService.createAdmin(this.adminForm.getRawValue())
        : this.userService.createEmployee(this.employeeForm.getRawValue());

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.successInfo.set(
          this.role() === 'employee'
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
