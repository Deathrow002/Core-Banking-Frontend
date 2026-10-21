import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { AUTH_API } from '../auth/auth.service';
import {
  ManagedUser,
  PageResponse,
  UserCreatePayload,
  UserRole,
  UserUpdatePayload,
} from '../auth/auth.models';

export const CUSTOMER_ROLE = 'CUSTOMER';
export const ADMIN_ROLE = 'ADMIN';
export const PAGE_SIZES: readonly number[] = [10, 20, 50, 100];

/** Only ADMIN may assign the ADMIN role; everyone else sees the rest of the roles. */
export function assignableRoles(roles: readonly UserRole[], isAdmin: boolean): readonly UserRole[] {
  return isAdmin ? roles : roles.filter((role) => role !== ADMIN_ROLE);
}

/** Talks to /api/v1/auth/users. Mutations prime CSRF first, like AuthService does. */
@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly http = inject(HttpClient);

  /** Role names from the backend roles table. */
  roles(): Observable<UserRole[]> {
    return this.http.get<UserRole[]>(`${AUTH_API.users}/roles`);
  }

  list(page: number, size: number): Observable<PageResponse<ManagedUser>> {
    return this.http.get<PageResponse<ManagedUser>>(AUTH_API.users, { params: { page, size } });
  }

  get(id: string): Observable<ManagedUser> {
    return this.http.get<ManagedUser>(`${AUTH_API.users}/${id}`);
  }

  create(payload: UserCreatePayload): Observable<ManagedUser> {
    return this.withCsrf(() => this.http.post<ManagedUser>(AUTH_API.users, payload));
  }

  update(id: string, payload: UserUpdatePayload): Observable<ManagedUser> {
    return this.withCsrf(() => this.http.put<ManagedUser>(`${AUTH_API.users}/${id}`, payload));
  }

  delete(id: string): Observable<void> {
    return this.withCsrf(() => this.http.delete<void>(`${AUTH_API.users}/${id}`));
  }

  private withCsrf<T>(request: () => Observable<T>): Observable<T> {
    return this.http.get<void>(AUTH_API.csrf).pipe(switchMap(request));
  }
}

/**
 * The backend answers rule violations (400) and access denials (403) with a plain-text reason,
 * so string bodies are shown as-is; anything else falls back to the given message.
 */
export function toUserErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Unable to reach the authentication service. Please try again later.';
    }
    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (error.status === 404) {
      return 'That user no longer exists.';
    }
    if ((error.status === 400 || error.status === 403) && typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }
    if (error.status === 403) {
      return 'You do not have permission to do that.';
    }
  }
  return fallback;
}
