import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { authGuard, guestGuard } from './auth.guard';
import { authInterceptor } from './auth.interceptor';
import { AUTH_API, AuthService } from './auth.service';

describe('session guards and interceptor', () => {
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  function runGuard(guard: typeof authGuard, url = '/home') {
    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;
    return firstValueFrom(result);
  }

  function signIn() {
    TestBed.inject(AuthService).ensureSession().subscribe();
    http.expectOne(AUTH_API.me).flush({ username: 'a@b.com', customerId: null, roles: [] });
  }

  it('authGuard redirects to login with returnUrl when there is no session', async () => {
    const result = runGuard(authGuard, '/home');
    http.expectOne(AUTH_API.me).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(router.serializeUrl((await result) as UrlTree)).toBe('/login?returnUrl=%2Fhome');
  });

  it('authGuard allows navigation when the session is live', async () => {
    const result = runGuard(authGuard);
    http.expectOne(AUTH_API.me).flush({ username: 'a@b.com', customerId: null, roles: [] });

    expect(await result).toBe(true);
  });

  it('guestGuard sends signed-in users home', async () => {
    signIn();

    expect(router.serializeUrl((await runGuard(guestGuard, '/login')) as UrlTree)).toBe('/home');
  });

  it('clears the session and redirects to login when an API call returns 401', () => {
    signIn();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    TestBed.inject(HttpClient).get('/api/v1/accounts').subscribe({ error: () => undefined });
    http.expectOne('/api/v1/accounts').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.anything());
  });
});
