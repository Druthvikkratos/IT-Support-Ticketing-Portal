import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';

@Component({
  selector: 'app-login-component',
  imports: [ReactiveFormsModule],
  templateUrl: './login-component.html',
  styleUrl: './login-component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder)
  private authService = inject(AuthService)
  private router = inject(Router)

  loading = signal(false)
  errorMessage = signal<string | null>(null)

  form = this.fb.nonNullable.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required]
  })


  submit(){
    if(this.form.invalid) return
    this.loading.set(true)
    this.errorMessage.set(null)

    const {identifier, password} = this.form.getRawValue()
    this.authService.login(identifier, password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.errorMessage.set("Invalid credentials. Please try again.")
        this.loading.set(false);
      }
    })
  }
}
