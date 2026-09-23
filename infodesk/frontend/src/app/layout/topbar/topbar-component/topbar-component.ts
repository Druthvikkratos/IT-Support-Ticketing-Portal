import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth-service';
import { SessionTimerService } from '../../../core/services/session-timer-service';
import { SocketService } from '../../../core/services/socket-service';

@Component({
  selector: 'app-topbar-component',
  imports: [],
  templateUrl: './topbar-component.html',
  styleUrl: './topbar-component.scss',
})
export class TopbarComponent {
  authService = inject(AuthService);
  sessionTimerService = inject(SessionTimerService);
  private socketService = inject(SocketService)

  logout() {
    this.sessionTimerService.clearSession()
    this.socketService.disconnect();
    this.authService.logout();
  }

  staySignedIn(){
    this.sessionTimerService.extendSession()
  }
}
