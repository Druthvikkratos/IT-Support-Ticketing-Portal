import { inject } from '@angular/core';
import { AuthService } from '../services/auth-service';
import { catchError, finalize, firstValueFrom, of, tap } from 'rxjs';
import { SessionTimerService } from '../services/session-timer-service';

export function initializeAuth() {
  const authService = inject(AuthService)
  const sessionTimerService = inject(SessionTimerService);

  localStorage.removeItem('infodesk_last_activity');

  return firstValueFrom(
    authService.loadCurrentUser().pipe(
      tap((user) => {
        if (
          user.role === 'employee' &&
          !sessionTimerService.hasActiveSession()
        ) {
          sessionTimerService.startSession();
        }
      }),
      catchError(() => of(null)),
      finalize(() => authService.markInitialized())
    )
  );
}
