import { computed, Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ConnectivityService {
  serverReachable = signal(true);
  deviceOnline = signal(navigator.onLine);

  private backOnline = new Subject<void>();
  backOnline$ = this.backOnline.asObservable();

  status = computed(() =>
    this.serverReachable()
      ? 'online'
      : this.deviceOnline()
        ? 'server-unreachable'
        : 'device-offline',
  );

  constructor() {
    window.addEventListener('online', () => {
      this.deviceOnline.set(true);
      this.check();
    });
    window.addEventListener('offline', () => {
      this.deviceOnline.set(false);
      this.setReachable(false);
    });
    setInterval(() => this.check(), 15_000);
    this.check();
  }

  check() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    fetch(`${environment.apiUrl}/health?ngsw-bypass=true&ts=${Date.now()}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((res) => this.setReachable(res.ok))
      .catch(() => this.setReachable(false))
      .finally(() => clearTimeout(timer));
  }

  private setReachable(value: boolean) {
    const was = this.serverReachable();
    this.serverReachable.set(value);
    if (value && !was) this.backOnline.next();
  }
}
