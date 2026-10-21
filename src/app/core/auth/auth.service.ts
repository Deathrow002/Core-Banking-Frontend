import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { LoginCredentials, Permission, RegisteredUser, SessionUser, SignUpPayload } from './auth.models';

export const AUTH_API = {
  csrf: '/api/v1/auth/csrf',
  login: '/api/v1/auth/login',
  me: '/api/v1/auth/me',
  logout: '/api/v1/auth/logout',
  register: '/api/v1/auth/register',
  users: '/api/v1/auth/users',
} as const;

/** Roles allowed to create logins for customers. Mirrors the backend @PreAuthorize on register. */
export const STAFF_ROLES: readonly string[] = ['ROLE_ADMIN', 'ROLE_MANAGER'];

/**
 * Server-side session auth: the backend keeps the session in Redis and the browser
 * holds only the HttpOnly SESSION cookie. Nothing sensitive is stored client-side;
 * the user signal is just a cache of GET /me.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly user = signal<SessionUser | null>(null);
  private sessionCheck$: Observable<boolean> | null = null;

  readonly currentUser = computed(() => this.user()?.username ?? null);
  readonly customerId = computed(() => this.user()?.customerId ?? null);
  readonly roles = computed(() => this.user()?.roles ?? []);
  readonly permissions = computed(() => this.user()?.permissions ?? []);
  readonly isAuthenticated = computed(() => this.user() !== null);

  hasRole(role: string): boolean {
    const normalized = role.startsWith('ROLE_') ? role : `ROLE_${role}`;
    return this.roles().includes(normalized);
  }

  /** Mirrors the backend hasAuthority('PERM_*') checks on create, update and delete. */
  hasPermission(permission: Permission): boolean {
    return this.permissions().includes(permission);
  }

  /** Resolves whether the browser has a live server session, calling GET /me at most once. */
  ensureSession(): Observable<boolean> {
    if (this.user()) {
      return of(true);
    }
    if (!this.isBrowser) {
      return of(false);
    }
    this.sessionCheck$ ??= this.http.get<SessionUser>(AUTH_API.me).pipe(
      tap((user) => this.user.set(user)),
      map(() => true),
      catchError(() => of(false)),
      shareReplay(1),
    );
    return this.sessionCheck$;
  }

  /**
   * Fetches a CSRF cookie first (Angular's XSRF interceptor echoes it as X-XSRF-TOKEN),
   * then posts form-encoded credentials because the backend binds them with @RequestParam.
   */
  login({ email, password }: LoginCredentials): Observable<SessionUser> {
    const body = new HttpParams().set('email', email).set('password', password);

    return this.http.get<void>(AUTH_API.csrf).pipe(
      switchMap(() => this.http.post<SessionUser>(AUTH_API.login, body)),
      tap((user) => {
        this.user.set(user);
        this.sessionCheck$ = null;
      }),
    );
  }

  isStaff(): boolean {
    return STAFF_ROLES.some((role) => this.roles().includes(role));
  }

  /**
   * Creates a login for an existing customer. Requires an ADMIN or MANAGER session;
   * primes CSRF first like login does, then posts JSON.
   */
  register(payload: SignUpPayload): Observable<RegisteredUser> {
    return this.http.get<void>(AUTH_API.csrf).pipe(
      switchMap(() => this.http.post<RegisteredUser>(AUTH_API.register, payload)),
    );
  }

  /** Invalidates the server session; local state is cleared even if the call fails. */
  logout(): Observable<void> {
    return this.http.post<void>(AUTH_API.logout, null).pipe(
      catchError((error: HttpErrorResponse) =>
        error.status === 401 || error.status === 403 ? of(undefined) : throwError(() => error),
      ),
      finalize(() => this.clear()),
    );
  }

  /** Drops cached user state after the server reports the session is gone. */
  clear(): void {
    this.user.set(null);
    this.sessionCheck$ = null;
  }
}
