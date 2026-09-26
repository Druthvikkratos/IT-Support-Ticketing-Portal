import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth-service';
import { SessionTimerService } from '../../../core/services/session-timer-service';
import { SocketService } from '../../../core/services/socket-service';
import { PollingService } from '../../../core/services/polling-service';
import { NotificationService } from '../../../core/services/notification-service';
import { Router } from '@angular/router';
import { AppNotification } from '../../../core/models/notification.model';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme-service';

@Component({
  selector: 'app-topbar-component',
  imports: [CommonModule],
  templateUrl: './topbar-component.html',
  styleUrl: './topbar-component.scss',
})
export class TopbarComponent {
  authService = inject(AuthService);
  sessionTimerService = inject(SessionTimerService);
  private socketService = inject(SocketService);
  pollingService = inject(PollingService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  themeService = inject(ThemeService)

  showNotifications = signal<boolean>(false);
  notifications = signal<AppNotification[]>([]);
  loadingNotifications = signal<boolean>(false);

  toggleNotifications() {
    this.showNotifications.update((v) => !v);
    if (this.showNotifications()) this.loadNotifications();
  }

  private loadNotifications() {
    this.loadingNotifications.set(true);
    this.notificationService.findMine().subscribe({
      next: (notification) => {
        this.notifications.set(notification);
        this.loadingNotifications.set(false);
      },
      error: (err) => {
        console.error('[Notifications] failed to load:', err);
        this.loadingNotifications.set(false);
      },
    });
  }

  openNotification(notification: AppNotification) {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          this.notifications.update((list) =>
            list.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
          );
          this.pollingService.refreshNow();
        },
        error: (err) => console.error('[Notifications] failed to mark read:', err),
      });
    }
    this.showNotifications.set(false);
    if (notification.ticketId) this.router.navigate(['/tickets', notification.ticketId]);
  }

  markAllRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
      },
      error: (err) => console.error('[Notifications] failed to mark all read:', err),
    });
  }

  notificationIcon(type: string): string {
    const icons: Record<string, string> = {
      ticket_raised: 'ti-ticket', status_changed: 'ti-refresh', new_message: 'ti-message-circle',
      ticket_closed: 'ti-circle-check', bulk_upload_result: 'ti-upload',
    };
    return icons[type] ?? 'ti-bell';
  }

  logout() {
    this.sessionTimerService.clearSession();
    this.socketService.disconnect();
    this.authService.logout();
  }

  staySignedIn() {
    this.sessionTimerService.extendSession();
  }
}
