import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/user.model';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private currentUserSignal = signal<User | null>(null);
  private initializedSignal = signal(false);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isInitialized = this.currentUserSignal.asReadonly();
  readonly isLogged = computed(() => this.currentUserSignal() != null);
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'admin');

  login(identifier: string, password: string): Observable<User> {
    return this.http
      .post<User>(
        `${environment.apiUrl}/auth/login`,
        { identifier, password },
        { withCredentials: true },
      )
      .pipe(tap((user) => this.currentUserSignal.set(user)));
  }

  logout(): void {
    this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }).subscribe({
      complete: () => {
        this.currentUserSignal.set(null);
        this.router.navigate(['/login']);
      },
    });
  }

  loadCurrentUser(): Observable<User> {
    return this.http
      .get<User>(`${environment.apiUrl}/auth/me`, { withCredentials: true })
      .pipe(tap((user) => this.currentUserSignal.set(user)));
  }

  markInitialized(): void {
    this.initializedSignal.set(true);
  }

  clearSession(): void {
    this.currentUserSignal.set(null);
  }
}
