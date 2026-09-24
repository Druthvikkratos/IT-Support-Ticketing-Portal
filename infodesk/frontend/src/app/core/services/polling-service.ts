import { effect, inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth-service';
import { NotificationService } from './notification-service';
import { catchError, interval, of, Subscription, switchMap } from 'rxjs';

const POLL_INTERVAL_MS = 5000;

@Injectable({
  providedIn: 'root',
})
export class PollingService {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  unreadCount = signal(0);
  private sub?: Subscription;

  constructor() {
    // automatically start/stop polling whenever login state changes —
    // no external start()/stop() calls needed from AuthService anymore
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.start();
      } else {
        this.stop();
      }
    });
  }

  start() {
    if (this.sub) return;

    this.sub = interval(POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => {
          if (!this.authService.isLoggedIn()) return of(0);
          return this.notificationService.unreadCount().pipe(
            catchError((err) => {
              console.warn(
                '[Polling] unread count fetch failed, will retry next tick:',
                err.message,
              );
              return of(this.unreadCount());
            }),
          );
        }),
      )
      .subscribe((count) => this.unreadCount.set(count));
  }

  stop() {
    this.sub?.unsubscribe();
    this.sub = undefined;
    this.unreadCount.set(0);
  }

  refreshNow() {
    this.notificationService.unreadCount().subscribe((count) => this.unreadCount.set(count));
  }
}
