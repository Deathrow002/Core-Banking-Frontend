import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CustomerPage } from './customer.models';

export const CUSTOMER_API = {
  search: '/customers/search',
};

/** Read-only lookups against the Customer service through the gateway. */
@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);

  search(query: string, page = 0, size = 10): Observable<CustomerPage> {
    const params = new HttpParams().set('query', query).set('page', page).set('size', size);
    return this.http.get<CustomerPage>(CUSTOMER_API.search, { params });
  }
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
      return 'You do not have permission to search customers.';
    }
  }
  return fallback;
}
