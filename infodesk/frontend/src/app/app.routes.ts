import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard-guard';
import { adminGuard } from './core/guards/role-guard-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login-component/login-component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell-component/shell-component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-component/dashboard-component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/users-list/users-list').then((m) => m.UsersList),
      },
    ],
  },
  {
    path: '*',
    redirectTo: 'login',
  },
];
