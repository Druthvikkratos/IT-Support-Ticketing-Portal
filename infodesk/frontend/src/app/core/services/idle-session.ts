import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth-service';

const IDLE_TIMEOUT_MINUTES = 30;
const WARNING_MINUTES = 10;
export const IDLE_STORAGE_KEY = 'infodesk_last_activity';
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
const WRITE_THROTTLE_MS = 15000;

@Injectable({
  providedIn: 'root',
})
export class IdleSession {
  private authService = inject(AuthService);

  private now = signal(Date.now());
  private lastActivity = signal(this.readStoredActivity());
  private lastWriteAt = 0;
  private listenersAttached = false;
  private tickHandle?: ReturnType<typeof setInterval>;

  private isTracked = computed(() => this.authService.isLoggedIn() && !this.authService.isAdmin());
  private idleMs = computed(() => this.now() - this.lastActivity());
  private idleMinutesRemaining = computed(() =>
    Math.max(0, IDLE_TIMEOUT_MINUTES - this.idleMs() / 60000),
  );
  showWarning = computed(
    () =>
      this.isTracked() &&
      this.idleMinutesRemaining() <= WARNING_MINUTES &&
      this.idleMinutesRemaining() > 0,
  );
  secondsRemaining = computed(() => Math.ceil(this.idleMinutesRemaining() * 60));

  constructor() {
    effect(() => {
      if (this.isTracked()) this.start();
      else this.stop();
    });
  }

  hasExceededIdleLimitForStorage(): boolean {
    const elapsedMinutes = Date.now() - this.readStoredActivity() / 60000;
    return elapsedMinutes >= IDLE_TIMEOUT_MINUTES;
  }

  extendSession() {
    this.recordActivity(true);
  }

  private readStoredActivity(): number {
    const raw = localStorage.getItem(IDLE_STORAGE_KEY);
    return raw ? Number(raw) : Date.now();
  }

  private recordActivity(force = false) {
    const nowMs = Date.now();
    this.lastActivity.set(nowMs);

    if (force || nowMs - this.lastWriteAt > WRITE_THROTTLE_MS) {
      localStorage.setItem(IDLE_STORAGE_KEY, String(nowMs));
      this.lastWriteAt = nowMs;
    }
  }

  private start() {
    if (this.listenersAttached) return;
    this.listenersAttached = true;
    this.recordActivity(true);
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, this.onActivity, { passive: true }),
    );
    this.tickHandle = setInterval(() => {
      this.now.set(Date.now());
      if (this.idleMinutesRemaining() <= 0) {
        this.stop();
        localStorage.removeItem(IDLE_STORAGE_KEY);
        this.authService.logout(); // clears the real cookie server-side too, not just the local state
      }
    }, 1000);
  }

  private stop() {
    if (!this.listenersAttached) return;
    this.listenersAttached = false;
    ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, this.onActivity));
    if (this.tickHandle) clearInterval(this.tickHandle);
  }

  private onActivity = () => this.recordActivity();
}
