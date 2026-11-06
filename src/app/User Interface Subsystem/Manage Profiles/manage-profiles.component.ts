import { Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

export interface UserProfile {
  user_id: string;
  firstname: string;
  surname: string;
  email: string;
  role: string;
  supervisor_id?: string | null;
  academic_level?: string | null;
  enabled: boolean;
  keycloak_username?: string | null;
  keycloak_synced?: boolean;
  keycloak_id?: string | null;
  keycloak_roles?: string[];
  keycloak_enabled?: boolean;
  supervisor_firstname?: string | null;
  supervisor_surname?: string | null;
  supervisor_email?: string | null;
  submitted_count?: number;
  assigned_review_count?: number;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-manage-profiles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './manage-profiles.component.html',
  styleUrl: './manage-profiles.component.scss'
})
export class ManageProfilesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = 'http://localhost:3000/api/admin/users';

  // State signals
  readonly users = signal<UserProfile[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSyncing = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly keycloakConnected = signal<boolean>(false);
  readonly keycloakError = signal<string | null>(null);

  readonly successBanner = signal<string>('');
  readonly errorBanner = signal<string>('');

  // Search & Filter state
  readonly searchTerm = signal<string>('');
  readonly roleFilter = signal<string>('all');
  readonly statusFilter = signal<string>('all');

  // Create / Edit Modal state
  readonly isModalOpen = signal<boolean>(false);
  readonly modalMode = signal<'create' | 'edit'>('create');

  // Form fields
  formUserId = '';
  formUsername = '';
  formFirstName = '';
  formSurname = '';
  formEmail = '';
  formRole: 'Student' | 'Lecturer' | 'System Admin' = 'Student';
  formAcademicLevel: "Master's" | 'PhD' = "Master's";
  formSupervisorId = '';
  formPassword = '';
  formEnabled = true;
  formError = '';

  // Available lecturers for student supervisor dropdown
  readonly lecturers = computed<UserProfile[]>(() =>
    this.users().filter(u => (u.role || '').toLowerCase() === 'lecturer' && u.enabled !== false)
  );

  // Filtered users list
  readonly filteredUsers = computed<UserProfile[]>(() => {
    const q = this.searchTerm().trim().toLowerCase();
    const roleF = this.roleFilter().toLowerCase();
    const statusF = this.statusFilter().toLowerCase();

    return this.users().filter(u => {
      if (q) {
        const fullName = `${u.firstname || ''} ${u.surname || ''}`.toLowerCase();
        const uid = (u.user_id || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const uname = (u.keycloak_username || '').toLowerCase();
        if (!fullName.includes(q) && !uid.includes(q) && !email.includes(q) && !uname.includes(q)) {
          return false;
        }
      }

      if (roleF !== 'all') {
        const userRole = (u.role || '').toLowerCase();
        if (roleF === 'admin' && !userRole.includes('admin')) return false;
        if (roleF === 'lecturer' && userRole !== 'lecturer') return false;
        if (roleF === 'student' && userRole !== 'student') return false;
      }

      if (statusF === 'active' && u.enabled === false) return false;
      if (statusF === 'deactivated' && u.enabled !== false) return false;

      return true;
    });
  });

  // Summary statistics
  readonly stats = computed(() => {
    const all = this.users();
    const total = all.length;
    const students = all.filter(u => (u.role || '').toLowerCase() === 'student').length;
    const lecturersCount = all.filter(u => (u.role || '').toLowerCase() === 'lecturer').length;
    const admins = all.filter(u => (u.role || '').toLowerCase().includes('admin')).length;
    const synced = all.filter(u => u.keycloak_synced).length;
    const active = all.filter(u => u.enabled !== false).length;
    return { total, students, lecturersCount, admins, synced, active };
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUsers();
    } else {
      this.isLoading.set(false);
    }
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.errorBanner.set('');

    this.http.get<any>(this.apiUrl)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: res => {
          this.users.set(res.users || []);
          this.keycloakConnected.set(!!res.keycloakConnected);
          this.keycloakError.set(res.keycloakError || null);
        },
        error: err => {
          this.errorBanner.set(err.error?.error || 'Failed to load user profiles.');
        }
      });
  }

  syncWithKeycloak(): void {
    if (this.isSyncing()) return;
    this.isSyncing.set(true);
    this.successBanner.set('');
    this.errorBanner.set('');

    this.http.post<any>(`${this.apiUrl}/sync`, {})
      .pipe(finalize(() => this.isSyncing.set(false)))
      .subscribe({
        next: res => {
          this.users.set(res.users || []);
          this.keycloakConnected.set(!!res.keycloakConnected);
          this.keycloakError.set(res.keycloakError || null);
          this.successBanner.set(res.message || 'Synchronized profiles with Keycloak.');
        },
        error: err => {
          this.errorBanner.set(err.error?.error || 'Failed to synchronize with Keycloak.');
        }
      });
  }

  openCreateModal(): void {
    this.modalMode.set('create');
    this.formUserId = '';
    this.formUsername = '';
    this.formFirstName = '';
    this.formSurname = '';
    this.formEmail = '';
    this.formRole = 'Student';
    this.formAcademicLevel = "Master's";
    this.formSupervisorId = this.lecturers()[0]?.user_id || '';
    this.formPassword = 'password';
    this.formEnabled = true;
    this.formError = '';
    this.isModalOpen.set(true);
  }

  openEditModal(user: UserProfile): void {
    this.modalMode.set('edit');
    this.formUserId = user.user_id;
    this.formUsername = user.keycloak_username || '';
    this.formFirstName = user.firstname || '';
    this.formSurname = user.surname || '';
    this.formEmail = user.email || '';
    const r = (user.role || '').toLowerCase();
    this.formRole = r.includes('admin') ? 'System Admin' : r === 'lecturer' ? 'Lecturer' : 'Student';
    this.formAcademicLevel = (user.academic_level || '').toLowerCase().includes('phd') ? 'PhD' : "Master's";
    this.formSupervisorId = user.supervisor_id || '';
    this.formPassword = '';
    this.formEnabled = user.enabled !== false;
    this.formError = '';
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    if (this.isSaving()) return;
    this.isModalOpen.set(false);
    this.formError = '';
  }

  saveProfile(): void {
    if (this.isSaving()) return;
    this.formError = '';

    if (!this.formFirstName.trim() || !this.formSurname.trim()) {
      this.formError = 'First name and surname are required.';
      return;
    }
    if (!this.formEmail.trim() || !this.formEmail.includes('@')) {
      this.formError = 'A valid email address is required.';
      return;
    }

    const payload: any = {
      user_id: this.formUserId.trim() || undefined,
      username: this.formUsername.trim() || undefined,
      firstname: this.formFirstName.trim(),
      surname: this.formSurname.trim(),
      email: this.formEmail.trim(),
      role: this.formRole,
      academic_level: this.formRole === 'Student' ? this.formAcademicLevel : null,
      supervisor_id: this.formRole === 'Student' ? (this.formSupervisorId || null) : null,
      enabled: this.formEnabled,
      password: this.formPassword.trim() || undefined
    };

    this.isSaving.set(true);
    this.successBanner.set('');
    this.errorBanner.set('');

    const req$ = this.modalMode() === 'create'
      ? this.http.post<any>(this.apiUrl, payload)
      : this.http.put<any>(`${this.apiUrl}/${encodeURIComponent(this.formUserId)}`, payload);

    req$.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: res => {
        if (res.users) {
          this.users.set(res.users);
        } else {
          this.loadUsers();
        }
        this.successBanner.set(res.message || 'User profile saved and synchronized with Keycloak.');
        this.isModalOpen.set(false);
      },
      error: err => {
        this.formError = err.error?.error || 'Failed to save user profile.';
      }
    });
  }

  toggleStatus(user: UserProfile): void {
    const nextState = user.enabled === false;
    const actionWord = nextState ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${actionWord} ${user.firstname} ${user.surname} (${user.user_id}) in PostgreSQL and Keycloak?`)) {
      return;
    }

    this.successBanner.set('');
    this.errorBanner.set('');

    this.http.patch<any>(`${this.apiUrl}/${encodeURIComponent(user.user_id)}/status`, { enabled: nextState })
      .subscribe({
        next: res => {
          if (res.users) this.users.set(res.users);
          this.successBanner.set(res.message || `User ${user.user_id} status updated.`);
        },
        error: err => {
          this.errorBanner.set(err.error?.error || 'Failed to update user status.');
        }
      });
  }

  deleteProfile(user: UserProfile): void {
    if (!confirm(`Delete user ${user.firstname} ${user.surname} (${user.user_id}) from PostgreSQL and Keycloak? This cannot be undone.`)) {
      return;
    }

    this.successBanner.set('');
    this.errorBanner.set('');

    this.http.delete<any>(`${this.apiUrl}/${encodeURIComponent(user.user_id)}`)
      .subscribe({
        next: res => {
          if (res.users) this.users.set(res.users);
          this.successBanner.set(res.message || `User ${user.user_id} deleted.`);
        },
        error: err => {
          this.errorBanner.set(err.error?.error || 'Failed to delete user profile.');
        }
      });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.roleFilter.set('all');
    this.statusFilter.set('all');
  }

  roleBadgeClass(role: string): string {
    const r = (role || '').toLowerCase();
    if (r.includes('admin')) return 'role-pill--admin';
    if (r === 'lecturer') return 'role-pill--lecturer';
    return 'role-pill--student';
  }
}

