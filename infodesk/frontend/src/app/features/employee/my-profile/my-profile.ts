import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';
import { ThemeService } from '../../../core/services/theme-service';

@Component({
  selector: 'app-my-profile',
  imports: [RouterLink],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.scss',
})
export class MyProfile {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
}
