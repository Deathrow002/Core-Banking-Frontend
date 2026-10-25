import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { AUTH_API } from '../auth/auth.service';
import {
  CreatedCustomer,
  CustomerCreatePayload,
  CustomerPage,
  CustomerSummary,
  CustomerUpdatePayload,
} from './customer.models';

export const CUSTOMER_API = {
  search: '/customers/search',
  create: '/customers',
};

/** Talks to the Customer service through the gateway. Mutations prime CSRF first, like AccountService does. */
@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);

  search(query: string, page = 0, size = 10): Observable<CustomerPage> {
    const params = new HttpParams().set('query', query).set('page', page).set('size', size);
    return this.http.get<CustomerPage>(CUSTOMER_API.search, { params });
  }

  get(customerId: string): Observable<CustomerSummary> {
    const params = new HttpParams().set('customerId', customerId);
    return this.http.get<CustomerSummary>(CUSTOMER_API.create, { params });
  }

  update(customerId: string, payload: CustomerUpdatePayload): Observable<CustomerSummary> {
    const params = new HttpParams().set('customerId', customerId);
    return this.http
      .get<void>(AUTH_API.csrf)
      .pipe(
        switchMap(() => this.http.put<CustomerSummary>(CUSTOMER_API.create, payload, { params })),
      );
  }

  delete(customerId: string): Observable<void> {
    const params = new HttpParams().set('customerId', customerId);
    return this.http
      .get<void>(AUTH_API.csrf)
      .pipe(switchMap(() => this.http.delete<void>(CUSTOMER_API.create, { params })));
  }

  create(payload: CustomerCreatePayload): Observable<CreatedCustomer> {
    return this.http
      .get<void>(AUTH_API.csrf)
      .pipe(switchMap(() => this.http.post<CreatedCustomer>(CUSTOMER_API.create, payload)));
  }
}

/**
 * Create failures: 403 names the create action, and 409 (duplicate national ID) or 400 show the
 * ErrorResponse `message`. Other failures reuse the shared network and session messages.
 */
export function toCustomerCreateErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 403) {
      return 'You do not have permission to create customers.';
    }
    if (error.status === 409 || error.status === 400) {
      const message = (error.error as { message?: unknown } | null)?.message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  }
  return toCustomerErrorMessage(error, fallback);
}

export function toCustomerErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Unable to reach the customer service. Please try again later.';
    }
    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (error.status === 403) {
      return 'You do not have permission for this customer action.';
    }
  }
  return fallback;
}
