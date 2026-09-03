import { inject } from '@angular/core';
import { AuthService } from '../services/auth-service';
import { catchError, of } from 'rxjs';

export function initializeAuth() {
  const authService = inject(AuthService);

  return () =>
    authService
      .loadCurrentUser()
      .pipe(catchError(() => of(null)))
      .subscribe(() => authService.markInitialized());
}
