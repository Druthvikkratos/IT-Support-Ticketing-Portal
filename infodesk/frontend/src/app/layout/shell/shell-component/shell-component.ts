import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../sidebar/sidebar-component/sidebar-component';
import { TopbarComponent } from '../../topbar/topbar-component/topbar-component';
import { OfflineBanner } from '../../offline-banner/offline-banner';

@Component({
  selector: 'app-shell-component',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, OfflineBanner],
  templateUrl: './shell-component.html',
  styleUrl: './shell-component.scss',
})
export class ShellComponent {}
