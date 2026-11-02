import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  // Only attach token to backend requests, not to Keycloak itself
  if (isPlatformBrowser(platformId) && (req.url.includes(':3000') || req.url.startsWith('/api/'))) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Check if JWT token has expired
      try {
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const decoded = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            // Token expired - clear stale session
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            return next(req);
          }
        }
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        return next(req);
      }

      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next(cloned);
    }
  }

  return next(req);
};
