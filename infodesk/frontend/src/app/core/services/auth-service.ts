import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/user.model';
import { catchError, finalize, Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SocketService } from './socket-service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private socketService = inject(SocketService)

  private currentUserSignal = signal<User | null>(null);
  private initializedSignal = signal(false);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isInitialized = this.initializedSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUserSignal() != null);
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'admin');

  bootstrap(): Observable<User | null> {
  return this.loadCurrentUser().pipe(
    catchError(() => {
      this.currentUserSignal.set(null); // not logged in — that's fine, not an error
      return of(null);
    }),
    finalize(() => this.initializedSignal.set(true)),
  );
}

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
        this.socketService.disconnect();
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
