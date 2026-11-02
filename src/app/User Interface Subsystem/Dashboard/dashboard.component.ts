import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { PublicationService } from '../../services/publication.service';

export interface DashboardCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge?: string;
  link?: string;
  actionText: string;
  allowedRoles: string[];
  isActionModal?: 'profiles' | 'reports';
  cardNumber?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly pubService = inject(PublicationService);

  readonly user = this.authService.currentUser;

  // Stats
  readonly totalPublications = signal<number | null>(null);
  readonly pendingReviews = signal<number | null>(null);

  // Modals
  readonly activeModal = signal<'profiles' | 'reports' | null>(null);


  private readonly allCards: DashboardCard[] = [
    {
      id: 'submit',
      title: 'Submit Publication',
      description: 'Submit a new research paper, journal article, thesis, or dissertation for processing, supervisor verification, and faculty review.',
      icon: '↑',
      badge: 'Author Portal',
      link: '/submit-publication',
      actionText: 'Submit publication',
      allowedRoles: ['student', 'lecturer', 'reviewer', 'admin']
    },
    {
      id: 'review',
      title: 'Review Publication',
      description: 'Review submitted publications, inspect manuscripts, provide reviewer feedback, and approve or reject submissions.',
      icon: '✓',
      badge: 'Review Queue',
      link: '/review-publication',
      actionText: 'Review publications',
      allowedRoles: ['lecturer', 'reviewer', 'admin']
    },
    {
      id: 'search',
      title: 'View & Search Publications',
      description: 'Browse the publication repository and search for publications by title, author, department, or keyword.',
      icon: '⌕',
      badge: 'Repository',
      link: '/search-publications',
      actionText: 'Browse publications',
      allowedRoles: ['student', 'lecturer', 'reviewer', 'admin', '*']
    },
    {
      id: 'profiles',
      title: 'Manage Profiles',
      description: 'View and manage user profiles, roles, departmental supervisors, and publication permissions.',
      icon: '♙',
      badge: 'Administration',
      actionText: 'Manage profiles',
      allowedRoles: ['admin'],
      isActionModal: 'profiles'
    },
    {
      id: 'reports',
      title: 'Generate Report',
      description: 'Generate reports on submitted publications, publication statuses, reviews, and institutional research output.',
      icon: '▤',
      badge: 'Analytics',
      actionText: 'Generate reports',
      allowedRoles: ['admin'],
      isActionModal: 'reports'
    }
  ];

  // Dynamic cards tailored strictly to the user's role
  readonly visibleCards = computed(() => {
    const user = this.user();

    // If guest (not logged in)
    if (!user) {
      return [
        {
          id: 'search',
          title: 'View & Search Publications',
          description: 'Browse the university publication repository, search for publications by title, author, or department, and inspect research.',
          icon: '⌕',
          badge: 'Public Repository',
          link: '/search-publications',
          actionText: 'Browse publications',
          allowedRoles: ['*'],
          cardNumber: '01'
        },
        {
          id: 'login',
          title: 'Sign In to Portal',
          description: 'Sign in with your University of Botswana account to submit research publications, review submissions, or manage system records.',
          icon: '→',
          badge: 'Authentication',
          link: '/login',
          actionText: 'Sign in to account',
          allowedRoles: ['*'],
          cardNumber: '02'
        }
      ];
    }

    const roles = (user.roles || []).map(r => r.toLowerCase());
    const isAdmin = roles.includes('admin');

    const filtered = this.allCards.filter(card => {
      if (isAdmin) return true;
      if (card.allowedRoles.includes('*')) return true;
      return card.allowedRoles.some(r => roles.includes(r.toLowerCase()));
    });

    return filtered.map((card, idx) => ({
      ...card,
      cardNumber: String(idx + 1).padStart(2, '0')
    }));
  });

  // Current primary role label
  readonly roleLabel = computed(() => {
    const user = this.user();
    if (!user || !user.roles?.length) return 'Guest';
    const roles = user.roles.map(r => r.toLowerCase());
    if (roles.includes('admin')) return 'Administrator';
    if (roles.includes('lecturer') || roles.includes('reviewer')) return 'Lecturer';
    if (roles.includes('student')) return 'Student Author';
    return user.roles[0];
  });

  readonly roleBadgeClass = computed(() => {
    const user = this.user();
    if (!user || !user.roles?.length) return 'badge-guest';
    const roles = user.roles.map(r => r.toLowerCase());
    if (roles.includes('admin')) return 'badge-admin';
    if (roles.includes('lecturer') || roles.includes('reviewer')) return 'badge-lecturer';
    if (roles.includes('student')) return 'badge-student';
    return 'badge-default';
  });

  readonly roleIcon = computed(() => {
    const user = this.user();
    if (!user || !user.roles?.length) return '👤';
    const roles = user.roles.map(r => r.toLowerCase());
    if (roles.includes('admin')) return '🛡️';
    if (roles.includes('lecturer') || roles.includes('reviewer')) return '👨‍🏫';
    if (roles.includes('student')) return '🎓';
    return '👤';
  });

  readonly roleDescription = computed(() => {
    const user = this.user();
    if (!user || !user.roles?.length) {
      return 'You are browsing as a guest. Sign in to access your role-specific submission and review workspaces.';
    }
    const roles = user.roles.map(r => r.toLowerCase());
    if (roles.includes('admin')) {
      return 'Full Administrative Privilege — manage publications, oversee review processes, administer user profiles, and generate reports.';
    }
    if (roles.includes('lecturer') || roles.includes('reviewer')) {
      return 'Lecturer Workspace — submit academic research publications, evaluate student submissions, provide peer reviews, and browse repository research.';
    }
    if (roles.includes('student')) {
      return 'Student Author Workspace — submit new publications for supervisor review and browse repository publications.';
    }
    return 'University Publication Management Workspace.';
  });

  readonly gridClass = computed(() => {
    const count = this.visibleCards().length;
    if (count <= 2) return 'action-grid--two';
    if (count === 3) return 'action-grid--three';
    return 'action-grid--five';
  });

  ngOnInit(): void {
    this.refreshStats();
  }

  refreshStats(): void {
    this.pubService.fetchAllPublications().subscribe({
      next: res => this.totalPublications.set(res.total || 0),
      error: () => this.totalPublications.set(null)
    });

    if (this.authService.hasAnyRole('lecturer', 'reviewer', 'admin')) {
      this.pubService.fetchReviewList(1, 1).subscribe({
        next: res => this.pendingReviews.set(res.total || 0),
        error: () => this.pendingReviews.set(null)
      });
    } else {
      this.pendingReviews.set(null);
    }
  }

  logout(): void {
    this.authService.logout();
  }

  openModal(type: 'profiles' | 'reports'): void {
    this.activeModal.set(type);
  }

  closeModal(): void {
    this.activeModal.set(null);
  }

  onCardClick(card: DashboardCard): void {
    if (card.isActionModal) {
      this.openModal(card.isActionModal);
    } else if (card.link) {
      this.router.navigate([card.link]);
    }
  }


}
