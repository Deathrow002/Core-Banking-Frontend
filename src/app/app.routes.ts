import { Routes } from '@angular/router';
import { authGuard, guestGuard, staffGuard } from './core/auth/auth.guard';
import { PERMISSIONS } from './core/auth/auth.models';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'login',
    title: 'Sign in | Core Banking',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'users',
    title: 'Users | Core Banking',
    canActivate: [staffGuard],
    loadComponent: () => import('./features/users/user-list/user-list').then((m) => m.UserList),
  },
  {
    path: 'users/new',
    title: 'New user | Core Banking',
    canActivate: [staffGuard],
    data: { permission: PERMISSIONS.add },
    loadComponent: () => import('./features/users/user-form/user-form').then((m) => m.UserForm),
  },
  {
    path: 'users/:id',
    title: 'User details | Core Banking',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./features/users/user-detail/user-detail').then((m) => m.UserDetail),
  },
  {
    path: 'users/:id/edit',
    title: 'Edit user | Core Banking',
    canActivate: [staffGuard],
    data: { permission: PERMISSIONS.edit },
    loadComponent: () => import('./features/users/user-form/user-form').then((m) => m.UserForm),
  },
  {
    path: 'accounts/new',
    title: 'New account | Core Banking',
    canActivate: [staffGuard],
    data: { permission: PERMISSIONS.add },
    loadComponent: () =>
      import('./features/accounts/account-create/account-create').then((m) => m.AccountCreate),
  },
  {
    path: 'home',
    title: 'Home | Core Banking',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  { path: '**', redirectTo: 'home' },
];
