import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  scope: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly keycloakUrl = 'http://localhost:8180/realms/publications/protocol/openid-connect/token';
  private readonly clientId = 'publications-api';

  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const storedUser = localStorage.getItem('auth_user');
      const token = localStorage.getItem('auth_token');
      if (storedUser && token) {
        this.currentUser.set(JSON.parse(storedUser));
      }
    } catch {
      this.clearStorage();
    }
  }

  login(username: string, password: string): Observable<TokenResponse> {
    const body = new URLSearchParams();
    body.set('grant_type', 'password');
    body.set('client_id', this.clientId);
    body.set('username', username.trim());
    body.set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<TokenResponse>(this.keycloakUrl, body.toString(), { headers }).pipe(
      tap(response => {
        if (response.access_token) {
          const user = this.parseToken(response.access_token, username);
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('auth_token', response.access_token);
            localStorage.setItem('auth_user', JSON.stringify(user));
          }
          this.currentUser.set(user);
        }
      }),
      catchError(err => {
        let msg = 'Authentication failed. Please check your credentials.';
        if (err.status === 401 || err.error?.error === 'invalid_grant') {
          msg = 'Invalid username or password.';
        } else if (err.status === 0) {
          msg = 'Unable to connect to authentication server. Please ensure Keycloak is running.';
        }
        return throwError(() => new Error(msg));
      })
    );
  }

  logout(): void {
    this.clearStorage();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('auth_token');
  }

  hasRole(role: string): boolean {
    const user = this.currentUser();
    if (!user || !user.roles) return false;
    return user.roles.some(r => r.toLowerCase() === role.toLowerCase());
  }

  hasAnyRole(...roles: string[]): boolean {
    const user = this.currentUser();
    if (!user || !user.roles) return false;
    if (user.roles.some(r => r.toLowerCase() === 'admin')) return true;
    return roles.some(role => user.roles.some(r => r.toLowerCase() === role.toLowerCase()));
  }

  getPrimaryRole(): string {
    const user = this.currentUser();
    if (!user || !user.roles || user.roles.length === 0) return 'Guest';
    const roles = user.roles.map(r => r.toLowerCase());
    if (roles.includes('admin')) return 'Administrator';
    if (roles.includes('lecturer') || roles.includes('reviewer')) return 'Lecturer';
    if (roles.includes('student')) return 'Student';
    return user.roles[0];
  }

  private clearStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  }

  private parseToken(token: string, fallbackUsername: string): AuthUser {
    try {
      const payloadBase64 = token.split('.')[1];
      const decodedJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(decodedJson);

      const roles: string[] = [];
      if (Array.isArray(payload.realm_roles)) {
        roles.push(...payload.realm_roles);
      } else if (payload.realm_access?.roles) {
        roles.push(...payload.realm_access.roles);
      }

      return {
        id: payload.user_id || payload.sub || fallbackUsername,
        username: payload.preferred_username || fallbackUsername,
        email: payload.email || '',
        name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || fallbackUsername,
        firstName: payload.given_name,
        lastName: payload.family_name,
        roles: roles.filter(r => !r.startsWith('default-roles-') && r !== 'offline_access' && r !== 'uma_authorization')
      };
    } catch {
      return {
        id: fallbackUsername,
        username: fallbackUsername,
        email: '',
        name: fallbackUsername,
        roles: ['student']
      };
    }
  }
}
