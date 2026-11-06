import { Component, inject, computed, signal, OnInit, PLATFORM_ID, HostListener, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { PublicationService } from '../../services/publication.service';
import { Publication, ReviewPublication, ReviewComment } from '../../models/publication.model';

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
  readonly pendingReviewPublications = signal<ReviewPublication[]>([]);
  readonly studentReviewedPublications = signal<any[]>([]);
  readonly isNotificationOpen = signal<boolean>(false);
  readonly allPublications = signal<Publication[]>([]);
  readonly reportGeneratedAt = signal<Date>(new Date());

  readonly isReviewerRole = computed(() =>
    this.authService.hasAnyRole('lecturer', 'reviewer', 'admin')
  );

  readonly bellNotificationCount = computed(() =>
    this.isReviewerRole()
      ? (this.pendingReviews() ?? 0)
      : this.studentReviewedPublications().length
  );

  // Report Filters
  readonly reportStatusFilter = signal<string>('all');
  readonly reportTypeFilter = signal<string>('all');

  // Modals
  readonly activeModal = signal<'reports' | 'feedback' | null>(null);
  readonly selectedReviewFeedbackPub = signal<any | null>(null);
  readonly reviewFeedbackComments = signal<ReviewComment[]>([]);
  readonly loadingComments = signal<boolean>(false);

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

  constructor() {
    effect(() => {
      const currentUser = this.user();
      if (isPlatformBrowser(this.platformId) && currentUser) {
        this.refreshStats();
      }
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.refreshStats();
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.isNotificationOpen()) {
      this.isNotificationOpen.set(false);
    }
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    const nextState = !this.isNotificationOpen();
    this.isNotificationOpen.set(nextState);
    if (nextState) {
      this.refreshStats();
    }
  }

  closeNotifications(): void {
    this.isNotificationOpen.set(false);
  }

  openPendingPublication(pub: ReviewPublication): void {
    this.isNotificationOpen.set(false);
    this.router.navigate(['/review-publication', pub.publication_id], {
      state: { publication: pub }
    });
  }

  openStudentNotification(pub: any): void {
    this.isNotificationOpen.set(false);
    this.selectedReviewFeedbackPub.set(pub);
    this.activeModal.set('feedback');
    this.loadingComments.set(true);
    this.reviewFeedbackComments.set([]);

    if (pub?.publication_id) {
      this.pubService.getComments(pub.publication_id).subscribe({
        next: comments => {
          this.reviewFeedbackComments.set(comments || []);
          this.loadingComments.set(false);
        },
        error: () => {
          this.loadingComments.set(false);
        }
      });
    } else {
      this.loadingComments.set(false);
    }
  }

  closeFeedbackModal(): void {
    this.activeModal.set(null);
    this.selectedReviewFeedbackPub.set(null);
    this.reviewFeedbackComments.set([]);
  }

  goToRepositoryFromFeedback(): void {
    this.closeFeedbackModal();
    this.router.navigate(['/search-publications']);
  }

  goToResubmitFromFeedback(): void {
    this.closeFeedbackModal();
    this.router.navigate(['/submit-publication']);
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
      this.pubService.fetchReviewList(1, 30).subscribe({
        next: res => {
          const list = res.publications || [];
          const pendingOnly = list.filter(p => {
            const st = (p.status || '').trim().toLowerCase();
            return st === 'pending' || st === 'submitted';
          });
          this.pendingReviewPublications.set(pendingOnly);
          this.pendingReviews.set(pendingOnly.length);
        },
        error: () => {
          this.pendingReviewPublications.set([]);
          this.pendingReviews.set(null);
        }
      });
      this.studentReviewedPublications.set([]);
    } else if (this.user()) {
      this.pendingReviewPublications.set([]);
      this.pendingReviews.set(null);
      this.pubService.fetchMySubmissions().subscribe({
        next: res => {
          const list = res.publications || [];
          const reviewedOnly = list.filter(p => {
            const st = (p.status || '').trim().toLowerCase();
            return st === 'approved' || st === 'rejected';
          });
          this.studentReviewedPublications.set(reviewedOnly);
        },
        error: () => {
          this.studentReviewedPublications.set([]);
        }
      });
    } else {
      this.pendingReviewPublications.set([]);
      this.pendingReviews.set(null);
      this.studentReviewedPublications.set([]);
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

  /**
   * Downloads the report as a CSV file (opens in Excel / Google Sheets).
   *
   * It exports exactly what the admin sees in the modal: the Status and
   * Publication Type filters apply, so choosing "Thesis" and clicking
   * Download gives a Thesis-only report, and "All Publication Types" gives
   * everything.
   *
   * File sections:
   *   1. Report title, generated date and the active filters
   *   2. Summary (totals and approval / pending / rejected rates)
   *   3. Breakdown by publication type
   *   4. Reviewer / supervisor workload
   *   5. Detailed publication registry
   */
  downloadReportCsv(): void {
    // Only admins can export, and downloads only make sense in the browser
    if (!isPlatformBrowser(this.platformId) || !this.authService.hasRole('admin')) {
      return;
    }

    const stats = this.reportStats();
    const pubs = this.filteredReportPublications();
    const generated = this.reportGeneratedAt();

    // Escapes one CSV cell. Text starting with = + - @ is prefixed with an
    // apostrophe so spreadsheet apps never treat user-entered text as a formula.
    const cell = (value: unknown): string => {
      let text = String(value ?? '');
      if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) {
        text = "'" + text;
      }
      return `"${text.replace(/"/g, '""')}"`;
    };
    const row = (cells: unknown[]): string => cells.map(cell).join(',');

    const personName = (first?: string | null, last?: string | null): string =>
      `${first || ''} ${last || ''}`.trim();

    const lines: string[] = [];

    // 1. Title and active filters
    lines.push(row(['University of Botswana - Publication & Review Report']));
    lines.push(row(['Generated', generated.toISOString()]));
    lines.push(row(['Status filter', this.reportStatusFilter()]));
    lines.push(row(['Publication type filter', this.reportTypeFilter()]));
    lines.push('');

    // 2. Summary
    lines.push(row(['SUMMARY']));
    lines.push(row(['Measure', 'Count', 'Percentage']));
    lines.push(row(['Total matching submissions', stats.total, '']));
    lines.push(row(['Approved', stats.approved, `${stats.approvalRate}%`]));
    lines.push(row(['Pending review', stats.pending, `${stats.pendingRate}%`]));
    lines.push(row(['Rejected', stats.rejected, `${stats.rejectedRate}%`]));
    lines.push('');

    // 3. Breakdown by publication type
    lines.push(row(['BREAKDOWN BY PUBLICATION TYPE']));
    lines.push(row(['Publication type', 'Total', 'Approved', 'Pending', 'Rejected', 'Share']));
    for (const item of stats.byType) {
      lines.push(row([item.label, item.total, item.approved, item.pending, item.rejected, `${item.percentage}%`]));
    }
    lines.push('');

    // 4. Reviewer workload
    lines.push(row(['REVIEWER / SUPERVISOR WORKLOAD']));
    lines.push(row(['Assigned lecturer', 'Email', 'Total', 'Approved', 'Pending', 'Rejected']));
    for (const rev of stats.byReviewer) {
      lines.push(row([rev.name, rev.email, rev.total, rev.approved, rev.pending, rev.rejected]));
    }
    lines.push('');

    // 5. Detailed registry
    lines.push(row([`DETAILED PUBLICATION REGISTRY (${pubs.length} records)`]));
    lines.push(row([
      'Reference', 'Title', 'Authors', 'Type', 'Track',
      'Submitted by', 'Submitter email', 'Assigned reviewer',
      'Submitted date', 'Status'
    ]));
    for (const pub of pubs) {
      lines.push(row([
        pub.publication_reference || pub.publication_id,
        pub.title,
        this.formatAuthors(pub.authors),
        pub.publication_type || 'N/A',
        pub.academic_level || pub.submitter_academic_level || '',
        personName(pub.submitter_firstname, pub.submitter_surname),
        pub.submitter_email || '',
        personName(pub.lecturer_firstname, pub.lecturer_surname) || pub.lecturer_id || '',
        this.formatDate(pub.submitted_at || pub.created_at),
        pub.status || 'Pending'
      ]));
    }

    // File name reflects the filters, e.g. publication-report-thesis-all-2026-11-06.csv
    const fileName = this.reportFileName('csv');

    // The BOM (\uFEFF) makes Excel read the file as UTF-8 so names display correctly
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Downloads the report as a PDF (A4 landscape).
   *
   * Same data and filters as the CSV: the Status and Publication Type
   * filters apply. The PDF libraries (jspdf and jspdf-autotable) are loaded
   * on demand when the button is clicked, so they do not add to the initial
   * page load.
   *
   * Requires:  npm install jspdf jspdf-autotable
   */
  async downloadReportPdf(): Promise<void> {
    // Only admins can export, and downloads only make sense in the browser
    if (!isPlatformBrowser(this.platformId) || !this.authService.hasRole('admin')) {
      return;
    }

    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      const autoTable = autoTableModule.default;

      const stats = this.reportStats();
      const pubs = this.filteredReportPublications();
      const generated = this.reportGeneratedAt();

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 40;
      const maroon: [number, number, number] = [128, 0, 32];

      // The standard PDF fonts cannot draw the em dash, so use a plain hyphen
      const clean = (value: string): string => value.replace(/—/g, '-');
      const personName = (first?: string | null, last?: string | null): string =>
        `${first || ''} ${last || ''}`.trim();
      const statusLabel = (value: string): string =>
        value === 'all' ? 'All statuses' : value.charAt(0).toUpperCase() + value.slice(1);
      const typeLabel = (value: string): string =>
        value === 'all' ? 'All publication types' : value;

      const lastY = (): number => (doc as any).lastAutoTable?.finalY ?? 100;

      // Moves to a new page when there is not enough room left for the next block
      const ensureSpace = (y: number, needed: number): number => {
        if (y + needed > pageHeight - 50) {
          doc.addPage();
          return 50;
        }
        return y;
      };

      const sectionTitle = (text: string, y: number): number => {
        const startY = ensureSpace(y, 60);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text(text, marginX, startY);
        return startY + 8;
      };

      const headStyles = { fillColor: maroon, textColor: 255, fontStyle: 'bold' as const };
      const margin = { left: marginX, right: marginX };

      // Title block
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(maroon[0], maroon[1], maroon[2]);
      doc.text('University of Botswana', marginX, 50);
      doc.setFontSize(13);
      doc.setTextColor(40, 40, 40);
      doc.text('Publication & Review Report', marginX, 70);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Generated: ${this.formatDate(generated.toISOString())}    |    ` +
        `Status: ${statusLabel(this.reportStatusFilter())}    |    ` +
        `Type: ${typeLabel(this.reportTypeFilter())}`,
        marginX,
        86
      );

      // 1. Summary
      let y = sectionTitle('Summary', 110);
      autoTable(doc, {
        startY: y,
        head: [['Measure', 'Count', 'Percentage']],
        body: [
          ['Total matching submissions', String(stats.total), ''],
          ['Approved', String(stats.approved), `${stats.approvalRate}%`],
          ['Pending review', String(stats.pending), `${stats.pendingRate}%`],
          ['Rejected', String(stats.rejected), `${stats.rejectedRate}%`]
        ],
        theme: 'grid',
        headStyles,
        styles: { fontSize: 9 },
        margin,
        tableWidth: 360
      });

      // 2. Breakdown by publication type
      y = sectionTitle('Breakdown by Publication Type', lastY() + 24);
      autoTable(doc, {
        startY: y,
        head: [['Publication type', 'Total', 'Approved', 'Pending', 'Rejected', 'Share']],
        body: stats.byType.map(item => [
          item.label,
          String(item.total),
          String(item.approved),
          String(item.pending),
          String(item.rejected),
          `${item.percentage}%`
        ]),
        theme: 'grid',
        headStyles,
        styles: { fontSize: 9 },
        margin
      });

      // 3. Reviewer / supervisor workload
      y = sectionTitle('Reviewer / Supervisor Workload', lastY() + 24);
      autoTable(doc, {
        startY: y,
        head: [['Assigned lecturer', 'Email', 'Total', 'Approved', 'Pending', 'Rejected']],
        body: stats.byReviewer.length
          ? stats.byReviewer.map(rev => [
              rev.name,
              clean(rev.email),
              String(rev.total),
              String(rev.approved),
              String(rev.pending),
              String(rev.rejected)
            ])
          : [[{ content: 'No reviewer records found for current filter.', colSpan: 6, styles: { halign: 'center' } }]],
        theme: 'grid',
        headStyles,
        styles: { fontSize: 9 },
        margin
      });

      // 4. Detailed registry
      y = sectionTitle(`Detailed Publication Registry (${pubs.length} records)`, lastY() + 24);
      autoTable(doc, {
        startY: y,
        head: [['Reference', 'Title & authors', 'Type', 'Submitted by', 'Assigned reviewer', 'Date', 'Status']],
        body: pubs.length
          ? pubs.map(pub => [
              String(pub.publication_reference || pub.publication_id),
              `${pub.title}\nAuthors: ${clean(this.formatAuthors(pub.authors))}`,
              pub.publication_type || 'N/A',
              personName(pub.submitter_firstname, pub.submitter_surname) || '-',
              personName(pub.lecturer_firstname, pub.lecturer_surname) || pub.lecturer_id || '-',
              clean(this.formatDate(pub.submitted_at || pub.created_at)),
              pub.status || 'Pending'
            ])
          : [[{ content: 'No publications match the selected filters.', colSpan: 7, styles: { halign: 'center' } }]],
        theme: 'grid',
        headStyles,
        styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: { 1: { cellWidth: 230 } },
        margin
      });

      // Footer on every page: generated date and page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('University of Botswana - Publication Management System', marginX, pageHeight - 20);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginX, pageHeight - 20, { align: 'right' });
      }

      doc.save(this.reportFileName('pdf'));
    } catch (error) {
      console.error('Could not generate the PDF report:', error);
    }
  }

  /** Builds the download file name from the active filters, e.g. publication-report-thesis-all-2026-11-06.pdf */
  private reportFileName(extension: 'csv' | 'pdf'): string {
    const slug = (value: string): string =>
      value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'all';
    return (
      `publication-report-${slug(this.reportTypeFilter())}-${slug(this.reportStatusFilter())}-` +
      `${this.reportGeneratedAt().toISOString().slice(0, 10)}.${extension}`
    );
  }
}