import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ManagedUser, UserCreatePayload, UserUpdatePayload } from '../auth/auth.models';
import {
  assignableRoles,
  PAGE_SIZES,
  toUserErrorMessage,
  UserManagementService,
} from './user-management.service';

const CUSTOMER_ID = '3f2b8c1e-9a4d-4e7b-8f1a-2c3d4e5f6a7b';
const USER: ManagedUser = {
  id: 'u1',
  customerId: CUSTOMER_ID,
  email: 'new@bank.com',
  role: 'CUSTOMER',
  enabled: true,
  createdAt: '2025-01-01T10:00:00',
};

describe('UserManagementService', () => {
  let service: UserManagementService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UserManagementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists one page with page and size query params', () => {
    let result: unknown;
    service.list(2, 50).subscribe((page) => (result = page));

    const req = http.expectOne(
      (r) => r.url === '/api/v1/auth/users' && r.params.get('page') === '2' && r.params.get('size') === '50',
    );
    expect(req.request.method).toBe('GET');
    const body = { content: [USER], page: 2, size: 50, totalElements: 1, totalPages: 1 };
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('gets a single user by id', () => {
    service.get('u1').subscribe();

    const req = http.expectOne('/api/v1/auth/users/u1');
    expect(req.request.method).toBe('GET');
    req.flush(USER);
  });

  it('primes CSRF before creating a user', () => {
    const payload: UserCreatePayload = { customerId: CUSTOMER_ID, email: 'new@bank.com', password: 'longenough', role: 'CUSTOMER' };
    service.create(payload).subscribe();

    http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
    const req = http.expectOne('/api/v1/auth/users');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(USER);
  });

  it('primes CSRF before updating a user', () => {
    const payload: UserUpdatePayload = { email: null, password: 'newpassword', role: null, enabled: false };
    service.update('u1', payload).subscribe();

    http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
    const req = http.expectOne('/api/v1/auth/users/u1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush(USER);
  });

  it('primes CSRF before deleting a user', () => {
    service.delete('u1').subscribe();

    http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
    const req = http.expectOne('/api/v1/auth/users/u1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('loads role names from the roles table', () => {
    let result: unknown;
    service.roles().subscribe((names) => (result = names));

    const req = http.expectOne('/api/v1/auth/users/roles');
    expect(req.request.method).toBe('GET');
    req.flush(['CUSTOMER', 'MANAGER', 'ADMIN']);
    expect(result).toEqual(['CUSTOMER', 'MANAGER', 'ADMIN']);
  });

  it('hides ADMIN from a manager but shows every role to an admin', () => {
    const roles = ['CUSTOMER', 'MANAGER', 'ADMIN'];
    expect(assignableRoles(roles, false)).toEqual(['CUSTOMER', 'MANAGER']);
    expect(assignableRoles(roles, true)).toEqual(roles);
    expect(PAGE_SIZES).toEqual([10, 20, 50, 100]);
  });
});

describe('toUserErrorMessage', () => {
  const fallback = 'Fallback message.';

  it('shows the server reason for rule violations and denials', () => {
    expect(toUserErrorMessage(new HttpErrorResponse({ status: 400, error: 'Email already in use.' }), fallback)).toBe(
      'Email already in use.',
    );
    expect(toUserErrorMessage(new HttpErrorResponse({ status: 403, error: 'Managers cannot edit ADMIN users.' }), fallback)).toBe(
      'Managers cannot edit ADMIN users.',
    );
  });

  it('explains a 403 without a reason in plain words', () => {
    expect(toUserErrorMessage(new HttpErrorResponse({ status: 403, error: null }), fallback)).toBe(
      'You do not have permission to do that.',
    );
  });

  it('explains network, session and missing-user failures', () => {
    expect(toUserErrorMessage(new HttpErrorResponse({ status: 0 }), fallback)).toContain('Unable to reach');
    expect(toUserErrorMessage(new HttpErrorResponse({ status: 401 }), fallback)).toContain('session has expired');
    expect(toUserErrorMessage(new HttpErrorResponse({ status: 404 }), fallback)).toBe('That user no longer exists.');
  });

  it('falls back for anything else', () => {
    expect(toUserErrorMessage(new HttpErrorResponse({ status: 500 }), fallback)).toBe(fallback);
    expect(toUserErrorMessage(new Error('boom'), fallback)).toBe(fallback);
  });
});
