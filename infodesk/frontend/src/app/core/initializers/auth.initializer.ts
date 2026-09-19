import { inject } from '@angular/core';
import { AuthService } from '../services/auth-service';
import { catchError, finalize, firstValueFrom, of, tap } from 'rxjs';
import { IdleSession } from '../services/idle-session';

export function initializeAuth() {
  const authService = inject(AuthService);
  const idleSessionService = inject(IdleSession)

  return firstValueFrom(
    authService.loadCurrentUser().pipe(
      tap((user) => {
        if(user.role === 'employee' && idleSessionService.hasExceededIdleLimitForStorage()){
          authService.logout()
        }
      }),
      catchError(() => of(null)), // no valid session — continue as logged out
      finalize(() => authService.markInitialized()),
    ),
  );
}
