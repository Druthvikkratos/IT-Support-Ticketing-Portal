import { inject } from '@angular/core';
import { AuthService } from '../services/auth-service';
import { catchError, finalize, firstValueFrom, of } from 'rxjs';

export function initializeAuth() {
  const authService = inject(AuthService);

  return firstValueFrom(
    authService.loadCurrentUser().pipe(
      catchError(() => of(null)), // no valid session — continue as logged out
      finalize(() => authService.markInitialized()),
    ),
  );
}
