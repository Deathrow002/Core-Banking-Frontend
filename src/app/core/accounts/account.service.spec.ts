import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Account, AccountCreatePayload } from './account.models';
import { AccountService, toAccountErrorMessage } from './account.service';

const CUSTOMER_ID = '3f2b8c1e-9a4d-4e7b-8f1a-2c3d4e5f6a7b';
const PAYLOAD: AccountCreatePayload = {
  customerId: CUSTOMER_ID,
  balance: 500,
  currency: 'THB',
  accountType: 'SAVING',
};
const ACCOUNT: Account = { accountId: 'a1', ...PAYLOAD };

describe('AccountService', () => {
  let service: AccountService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AccountService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('primes CSRF before creating an account', () => {
    let result: Account | undefined;
    service.create(PAYLOAD).subscribe((account) => (result = account));

    http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
    const req = http.expectOne('/accounts/createAccount');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(PAYLOAD);
    req.flush(ACCOUNT, { status: 201, statusText: 'Created' });
    expect(result).toEqual(ACCOUNT);
  });
});

describe('toAccountErrorMessage', () => {
  const fallback = 'Fallback message.';

  it('shows the service message for an unknown customer', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: {
        timestamp: '2025-01-01T10:00:00',
        status: 409,
        error: 'Conflict',
        message: 'Customer ID does not exist',
      },
    });
    expect(toAccountErrorMessage(error, fallback)).toBe('Customer ID does not exist');
  });

  it('explains network, session and permission failures', () => {
    expect(toAccountErrorMessage(new HttpErrorResponse({ status: 0 }), fallback)).toContain(
      'Unable to reach',
    );
    expect(toAccountErrorMessage(new HttpErrorResponse({ status: 401 }), fallback)).toContain(
      'session has expired',
    );
    expect(toAccountErrorMessage(new HttpErrorResponse({ status: 403 }), fallback)).toContain(
      'permission',
    );
  });

  it('falls back for server errors and bodies without a message', () => {
    expect(
      toAccountErrorMessage(
        new HttpErrorResponse({ status: 500, error: { message: 'Account creation failed' } }),
        fallback,
      ),
    ).toBe(fallback);
    expect(
      toAccountErrorMessage(new HttpErrorResponse({ status: 409, error: null }), fallback),
    ).toBe(fallback);
    expect(toAccountErrorMessage(new Error('boom'), fallback)).toBe(fallback);
  });
});
