import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CreatedCustomer, CustomerCreatePayload, CustomerPage } from './customer.models';
import {
  CustomerService,
  toCustomerCreateErrorMessage,
  toCustomerErrorMessage,
} from './customer.service';

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

const PAYLOAD: CustomerCreatePayload = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@bank.com',
  phoneNumber: '0812345678',
  nationalId: '1234567890123',
  dateOfBirth: '1990-05-14',
  status: 'Active',
  addresses: [
    {
      address: '1 Sukhumvit Road',
      subDistrict: 'Khlong Toei',
      district: 'Khlong Toei',
      city: 'Bangkok',
      country: 'Thailand',
      zipCode: '10110',
      addressType: 'Present',
    },
  ],
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

  it('primes CSRF, then posts the customer to /customers', () => {
    const created: CreatedCustomer = {
      customerId: 'c1',
      firstName: 'Ada',
      lastName: 'Lovelace',
    };
    let result: CreatedCustomer | undefined;
    service.create(PAYLOAD).subscribe((customer) => (result = customer));

    http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
    const req = http.expectOne('/customers');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(PAYLOAD);
    req.flush(created, { status: 201, statusText: 'Created' });
    expect(result).toEqual(created);
  });
});

describe('toCustomerCreateErrorMessage', () => {
  const fallback = 'Fallback message.';

  it('shows the service message for a duplicate or invalid customer', () => {
    const body = { status: 409, error: 'Conflict', message: 'National ID already exists' };
    expect(
      toCustomerCreateErrorMessage(new HttpErrorResponse({ status: 409, error: body }), fallback),
    ).toBe('National ID already exists');
    expect(
      toCustomerCreateErrorMessage(
        new HttpErrorResponse({ status: 400, error: { message: 'Bad input' } }),
        fallback,
      ),
    ).toBe('Bad input');
  });

  it('names the create action for a permission failure', () => {
    expect(
      toCustomerCreateErrorMessage(new HttpErrorResponse({ status: 403 }), fallback),
    ).toContain('create customers');
  });

  it('uses the shared messages for network and session failures', () => {
    expect(toCustomerCreateErrorMessage(new HttpErrorResponse({ status: 0 }), fallback)).toContain(
      'Unable to reach',
    );
    expect(
      toCustomerCreateErrorMessage(new HttpErrorResponse({ status: 401 }), fallback),
    ).toContain('session has expired');
  });

  it('falls back when the server gives no message', () => {
    expect(
      toCustomerCreateErrorMessage(new HttpErrorResponse({ status: 409, error: null }), fallback),
    ).toBe(fallback);
    expect(toCustomerCreateErrorMessage(new HttpErrorResponse({ status: 500 }), fallback)).toBe(
      fallback,
    );
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
