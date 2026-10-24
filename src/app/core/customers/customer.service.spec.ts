import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CustomerPage } from './customer.models';
import { CustomerService, toCustomerErrorMessage } from './customer.service';

const PAGE: CustomerPage = {
  content: [
    {
      customerId: '3f2b8c1e-9a4d-4e7b-8f1a-2c3d4e5f6a7b',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@bank.com',
    },
  ],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 10,
};

describe('CustomerService', () => {
  let service: CustomerService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CustomerService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('searches customers with query, page and size params', () => {
    let result: CustomerPage | undefined;
    service.search('ada', 0, 10).subscribe((page) => (result = page));

    const req = http.expectOne(
      (r) =>
        r.url === '/customers/search' &&
        r.params.get('query') === 'ada' &&
        r.params.get('page') === '0' &&
        r.params.get('size') === '10',
    );
    expect(req.request.method).toBe('GET');
    req.flush(PAGE);
    expect(result).toEqual(PAGE);
  });
});

describe('toCustomerErrorMessage', () => {
  const fallback = 'Fallback message.';

  it('explains network, session and permission failures', () => {
    expect(toCustomerErrorMessage(new HttpErrorResponse({ status: 0 }), fallback)).toContain(
      'Unable to reach',
    );
    expect(toCustomerErrorMessage(new HttpErrorResponse({ status: 401 }), fallback)).toContain(
      'session has expired',
    );
    expect(toCustomerErrorMessage(new HttpErrorResponse({ status: 403 }), fallback)).toContain(
      'permission',
    );
  });

  it('falls back for anything else', () => {
    expect(toCustomerErrorMessage(new HttpErrorResponse({ status: 500 }), fallback)).toBe(fallback);
  });
});
