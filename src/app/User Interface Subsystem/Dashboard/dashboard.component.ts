import { Component, inject, computed, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { PublicationService } from '../../services/publication.service';
import { Publication } from '../../models/publication.model';

export interface DashboardCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge?: string;
  link?: string;
  actionText: string;
  allowedRoles: string[];
  isActionModal?: 'reports';
  cardNumber?: string;
}

export interface TypeBreakdown {
  type: string;
  label: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  percentage: number;
}

export interface ReviewerBreakdown {
  name: string;
  email: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly pubService = inject(PublicationService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly user = this.authService.currentUser;

  // Stats & Live Repository Data for Detailed Admin Report
  readonly totalPublications = signal<number | null>(null);
  readonly pendingReviews = signal<number | null>(null);
  readonly allPublications = signal<Publication[]>([]);
  readonly reportGeneratedAt = signal<Date>(new Date());

  // Report Filters
  readonly reportStatusFilter = signal<string>('all');
  readonly reportTypeFilter = signal<string>('all');

  // Modals
  readonly activeModal = signal<'reports' | null>(null);

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
      id: 'reports',
      title: 'Generate Report',
      description: 'View comprehensive analytical reports on submitted publications, approval rates, academic tracks, reviewer workloads, and repository output.',
      icon: '▤',
      badge: 'Analytics',
      actionText: 'Generate reports',
      allowedRoles: ['admin'],
      isActionModal: 'reports'
    }
  ];

  // Filtered publications for the detailed report
  readonly filteredReportPublications = computed<Publication[]>(() => {
    const statusFilter = this.reportStatusFilter().toLowerCase();
    const typeFilter = this.reportTypeFilter().toLowerCase();

    return this.allPublications().filter(pub => {
      const pubStatus = (pub.status || '').trim().toLowerCase();
      const pubType = (pub.publication_type || '').trim().toLowerCase();

      const matchesStatus = statusFilter === 'all' || pubStatus === statusFilter;
      const matchesType = typeFilter === 'all' || pubType === typeFilter;

      return matchesStatus && matchesType;
    });
  });

  // Detailed metrics computed from the filtered report dataset
  readonly reportStats = computed(() => {
    const pubs = this.filteredReportPublications();
    const total = pubs.length;

    let approved = 0;
    let pending = 0;
    let rejected = 0;

    for (const p of pubs) {
      const s = (p.status || '').trim().toLowerCase();
      if (s === 'approved') approved++;
      else if (s === 'rejected') rejected++;
      else pending++;
    }

    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    const pendingRate = total > 0 ? Math.round((pending / total) * 100) : 0;
    const rejectedRate = total > 0 ? Math.max(0, 100 - approvalRate - pendingRate) : 0;

    const typeDefinitions = [
      { type: 'Journal Article', label: 'Journal Article' },
      { type: 'Conference Paper', label: 'Conference Paper' },
      { type: 'Thesis', label: "Thesis (Master's)" },
      { type: 'Dissertation', label: 'Dissertation (PhD)' }
    ];

    const byType: TypeBreakdown[] = typeDefinitions.map(def => {
      const matching = pubs.filter(
        p => (p.publication_type || '').trim().toLowerCase() === def.type.toLowerCase()
      );
      const count = matching.length;
      return {
        type: def.type,
        label: def.label,
        total: count,
        approved: matching.filter(p => (p.status || '').toLowerCase() === 'approved').length,
        pending: matching.filter(p => {
          const st = (p.status || '').toLowerCase();
          return st !== 'approved' && st !== 'rejected';
        }).length,
        rejected: matching.filter(p => (p.status || '').toLowerCase() === 'rejected').length,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      };
    });

    const reviewerMap = new Map<string, ReviewerBreakdown>();
    for (const p of pubs) {
      const name = `${p.lecturer_firstname || ''} ${p.lecturer_surname || ''}`.trim() || p.lecturer_id || 'Unassigned';
      const email = p.lecturer_email || '—';
      const key = `${name}|${email}`;
      const existing = reviewerMap.get(key) || {
        name,
        email,
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0
      };
      existing.total++;
      const s = (p.status || '').trim().toLowerCase();
      if (s === 'approved') existing.approved++;
      else if (s === 'rejected') existing.rejected++;
      else existing.pending++;
      reviewerMap.set(key, existing);
    }

    const byReviewer = Array.from(reviewerMap.values()).sort((a, b) => b.total - a.total);

    return {
      total,
      approved,
      pending,
      rejected,
      approvalRate,
      pendingRate,
      rejectedRate,
      byType,
      byReviewer
    };
  });

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
      return 'Full Administrative Privilege — manage publications, oversee review processes, and generate detailed institutional research reports.';
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
    if (count === 4) return 'action-grid--four';
    return 'action-grid--five';
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.refreshStats();
    }
  }

  refreshStats(): void {
    this.pubService.fetchAllPublications().subscribe({
      next: res => {
        const pubs = res.publications || [];
        this.allPublications.set(pubs);
        this.totalPublications.set(res.total ?? pubs.length);
        this.reportGeneratedAt.set(new Date());
      },
      error: () => {
        this.totalPublications.set(null);
      }
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

  openModal(type: 'reports'): void {
    this.refreshStats();
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

  formatAuthors(authors: unknown): string {
    if (!authors) return '—';
    if (Array.isArray(authors)) {
      return authors.length > 0 ? authors.join(', ') : '—';
    }
    return String(authors);
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
