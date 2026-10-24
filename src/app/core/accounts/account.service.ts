import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { AUTH_API } from '../auth/auth.service';
import { Account, AccountCreatePayload } from './account.models';

export const ACCOUNT_API = {
  create: '/accounts/createAccount',
};

/** Talks to the Account service through the gateway. Mutations prime CSRF first, like UserManagementService does. */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);

  create(payload: AccountCreatePayload): Observable<Account> {
    return this.http
      .get<void>(AUTH_API.csrf)
      .pipe(switchMap(() => this.http.post<Account>(ACCOUNT_API.create, payload)));
  }
}

/**
 * The Account service answers rule violations (409 when the customer is unknown) with a JSON
 * ErrorResponse, so its `message` is shown when present; other failures use the fallback.
 */
export function toAccountErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Unable to reach the account service. Please try again later.';
    }
    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (error.status === 403) {
      return 'You do not have permission to create accounts.';
    }
    if (error.status === 409 || error.status === 400) {
      const message = (error.error as { message?: unknown } | null)?.message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  }
  return fallback;
}
