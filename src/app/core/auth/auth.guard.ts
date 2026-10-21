import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { Permission } from './auth.models';
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

/**
 * Requires a live session with an ADMIN or MANAGER role; other signed-in users go home.
 * A route can also require a permission with `data: { permission: PERMISSIONS.add }`.
 */
export const staffGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const permission = route.data?.['permission'] as Permission | undefined;

  return auth.ensureSession().pipe(
    map((active) => {
      if (!active) {
        return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
      }
      const allowed = auth.isStaff() && (!permission || auth.hasPermission(permission));
      return allowed ? true : router.createUrlTree(['/home']);
    }),
  );
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);

  return inject(AuthService)
    .ensureSession()
    .pipe(map((active) => (active ? router.createUrlTree(['/home']) : true)));
};
