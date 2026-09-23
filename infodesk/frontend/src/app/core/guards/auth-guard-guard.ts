import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take, map } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.isInitialized).pipe(
    filter((ready) => ready), // wait until bootstrap() has actually finished
    take(1),
    map(() => {
      if (authService.isLoggedIn()) return true;
      router.navigate(['/login']);
      return false;
    }),
  );
};
