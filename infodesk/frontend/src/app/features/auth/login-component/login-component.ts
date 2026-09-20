import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';
import { SessionTimerService } from '../../../core/services/session-timer-service';

@Component({
  selector: 'app-login-component',
  imports: [ReactiveFormsModule],
  templateUrl: './login-component.html',
  styleUrl: './login-component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private sessionTimerService = inject(SessionTimerService);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  form = this.fb.nonNullable.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    const { identifier, password } = this.form.getRawValue();
    this.authService.login(identifier, password).subscribe({
      next: (user) => {
        if (user.role === 'employee') this.sessionTimerService.startSession();
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.errorMessage.set('Invalid credentials. Please try again.');
        this.loading.set(false);
      },
    });
  }

  togglePasswordVisibility() {
    this.showPassword.update((v) => !v);
  }
}
