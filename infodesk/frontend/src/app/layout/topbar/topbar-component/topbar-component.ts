import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth-service';
import { IdleSession } from '../../../core/services/idle-session';

@Component({
  selector: 'app-topbar-component',
  imports: [],
  templateUrl: './topbar-component.html',
  styleUrl: './topbar-component.scss',
})
export class TopbarComponent {
  authService = inject(AuthService);
  idleSessionService = inject(IdleSession);

  logout() {
    this.authService.logout();
  }

  staySignedIn() {
    this.idleSessionService.extendSession();
  }

  formattedCountdown(): string {
    const total = this.idleSessionService.secondsRemaining();
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
