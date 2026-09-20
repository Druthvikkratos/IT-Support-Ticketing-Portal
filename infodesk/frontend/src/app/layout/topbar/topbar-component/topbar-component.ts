import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth-service';
import { SessionTimerService } from '../../../core/services/session-timer-service';

@Component({
  selector: 'app-topbar-component',
  imports: [],
  templateUrl: './topbar-component.html',
  styleUrl: './topbar-component.scss',
})
export class TopbarComponent {
  authService = inject(AuthService);
  sessionTimerService = inject(SessionTimerService);

  logout() {
    this.sessionTimerService.clearSession()
    this.authService.logout();
  }

  staySignedIn(){
    this.sessionTimerService.extendSession()
  }
}
