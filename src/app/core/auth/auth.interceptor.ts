import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AUTH_API, AuthService } from './auth.service';

const SESSION_PROBES: readonly string[] = [AUTH_API.me, AUTH_API.login, AUTH_API.logout];

/**
 * The SESSION cookie is HttpOnly and sent by the browser automatically, and Angular's
 * built-in XSRF interceptor adds X-XSRF-TOKEN, so this only reacts to expired sessions.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        req.url.startsWith('/api/') &&
        !SESSION_PROBES.includes(req.url) &&
        auth.isAuthenticated()
      ) {
        auth.clear();
        router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => error);
    }),
  );
};
