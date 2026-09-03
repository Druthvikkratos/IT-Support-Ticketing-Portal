import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../sidebar/sidebar-component/sidebar-component';
import { TopbarComponent } from '../../topbar/topbar-component/topbar-component';

@Component({
  selector: 'app-shell-component',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './shell-component.html',
  styleUrl: './shell-component.scss',
})
export class ShellComponent {}
