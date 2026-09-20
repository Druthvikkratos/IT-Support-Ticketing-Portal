import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth-service';

const SESSION_TIMEOUT_MINUTES = 60; // fixed 1 hour from login, not activity-based — deliberately simple
const WARNING_MINUTES = 10;
export const SESSION_STORAGE_KEY = 'infodesk_session_expires_at';

@Injectable({
  providedIn: 'root',
})
export class SessionTimerService {
  private authService = inject(AuthService);
  private now = signal(Date.now());
  private expiresAt = signal<number | null>(this.readStoredExpiry());

  remainingSeconds = computed(() => {
    const exp = this.expiresAt();
    if (!exp) return 0;
    return Math.max(0, Math.floor((exp - this.now()) / 1000));
  });

  showTimer = computed(
    () => !this.authService.isAdmin() && this.authService.isLoggedIn() && this.expiresAt() !== null,
  );

  isUrgent = computed(
    () => this.remainingSeconds() > 0 && this.remainingSeconds() <= WARNING_MINUTES * 60,
  );

  constructor() {
    // one plain interval for the app's lifetime — imperative checks only,
    // no effect() writing to signals, which is what caused the earlier crash
    setInterval(() => this.tick(), 1000);
  }

  startSession() {
    if (this.authService.isAdmin()) {
      this.clearSession();
      return;
    }
    const expiry = Date.now() + SESSION_TIMEOUT_MINUTES * 60 * 1000;
    this.expiresAt.set(expiry);
    localStorage.setItem(SESSION_STORAGE_KEY, String(expiry));
  }

  hasActiveSession(): boolean {
    const exp = this.expiresAt();
    return exp !== null && exp > Date.now();
  }

  extendSession() {
    this.startSession();
  }

  clearSession() {
    this.expiresAt.set(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  formattedRemaining(): string {
    const total = this.remainingSeconds();
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private tick() {
    this.now.set(Date.now());

    if (!this.authService.isLoggedIn() || this.authService.isAdmin()) return;

    const exp = this.expiresAt();
    if (exp && Date.now() >= exp) {
      this.clearSession();
      this.authService.logout();
    }
  }

  private readStoredExpiry(): number | null {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? Number(raw) : null;
  }
}
