import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);

  return inject(AuthService)
    .ensureSession()
    .pipe(
      map((active) =>
        active ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }),
      ),
    );
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);

  return inject(AuthService)
    .ensureSession()
    .pipe(map((active) => (active ? router.createUrlTree(['/home']) : true)));
};
