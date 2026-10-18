import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AUTH_API, AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('primes CSRF, posts form-encoded credentials and keeps no token client-side', () => {
    service.login({ email: 'jane@bank.com', password: 'secret' }).subscribe();

    http.expectOne(AUTH_API.csrf).flush(null, { status: 204, statusText: 'No Content' });
    const req = http.expectOne(AUTH_API.login);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.body.toString()).toBe('email=jane@bank.com&password=secret');
    req.flush({ username: 'jane@bank.com', customerId: 'c-1', roles: ['ROLE_ADMIN'] });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()).toBe('jane@bank.com');
    expect(service.customerId()).toBe('c-1');
    expect(service.hasRole('ADMIN')).toBe(true);
    expect(localStorage.length).toBe(0);
  });

  it('restores an existing server session once via /me', async () => {
    const first = firstValueFrom(service.ensureSession());
    const second = firstValueFrom(service.ensureSession());

    http.expectOne(AUTH_API.me).flush({ username: 'a@b.com', customerId: null, roles: ['ROLE_USER'] });

    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(service.currentUser()).toBe('a@b.com');
  });

  it('reports no session when /me returns 401', async () => {
    const result = firstValueFrom(service.ensureSession());

    http.expectOne(AUTH_API.me).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(await result).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('invalidates the server session on logout', () => {
    service.login({ email: 'a@b.com', password: 'x' }).subscribe();
    http.expectOne(AUTH_API.csrf).flush(null);
    http.expectOne(AUTH_API.login).flush({ username: 'a@b.com', customerId: null, roles: [] });

    service.logout().subscribe();
    const req = http.expectOne(AUTH_API.logout);
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(service.isAuthenticated()).toBe(false);
  });

  it('clears local state even if the session already expired', () => {
    service.logout().subscribe();
    http.expectOne(AUTH_API.logout).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(service.isAuthenticated()).toBe(false);
  });
});
