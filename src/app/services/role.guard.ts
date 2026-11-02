import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Ensures user is authenticated before accessing a route.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/login');
};

/**
 * Ensures user has at least one of the specified roles (or is an admin).
 * Redirects unauthorized users back to the dashboard.
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.parseUrl('/login');
    }

    if (auth.hasAnyRole(...allowedRoles)) {
      return true;
    }

    // Role unauthorized for this route: redirect to dashboard
    return router.parseUrl('/dashboard');
  };
};
