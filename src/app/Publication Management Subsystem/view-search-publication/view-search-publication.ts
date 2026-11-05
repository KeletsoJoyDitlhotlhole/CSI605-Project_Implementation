import { Component, computed, inject, OnInit, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PublicationService } from '../../services/publication.service';
import { AuthService } from '../../services/auth.service';
import { Publication } from '../../models/publication.model';

export interface TypeReportItem {
  type: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  icon: string;
  dashArray: string;
  dashOffset: number;
}

export interface AcademicLevelItem {
  level: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  barHeight: number;
}

export interface TimelineItem {
  period: string;
  count: number;
  barHeight: number;
  percentage: number;
}

export interface KeywordStat {
  keyword: string;
  count: number;
  percentage: number;
}

@Component({
  selector: 'app-view-search-publication',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './view-search-publication.html',
  styleUrl: './view-search-publication.scss'
})
export class ViewSearchPublicationComponent implements OnInit, OnDestroy {
  private publicationService = inject(PublicationService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private platformId = inject(PLATFORM_ID);

  // Raw data from server
  rawPublications = signal<Publication[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');

  // Filter & Search state
  searchTerm = signal('');
  selectedType = signal('all');
  selectedSort = signal('newest');
  page = signal(1);
  pageSize = signal(10);
  viewMode = signal<'grid' | 'list'>('grid');

  // Analytics & Report state
  showAnalytics = signal<boolean>(true);
  analyticsScope = signal<'approved' | 'filtered'>('approved');

  // Fallback approved publications when database is fresh or empty
  private readonly fallbackApprovedPublications: Publication[] = [
    {
      publication_id: 'PUB-FALLBACK-01',
      publication_reference: 'UB-PUB-2026-A101',
      title: 'Empirical Analysis of Solar Microgrid Deployments in Ngamiland',
      abstract: 'Investigating decentralized solar microgrid performance and battery storage dynamics across rural northwest Botswana.',
      keywords: 'Renewable Energy, Solar Power, Rural Electrification, SADC Energy',
      status: 'Approved',
      publication_type: 'Journal Article',
      academic_level: "Master's",
      authors: ['Dr. P. Tau', 'K. Phiri'],
      created_at: '2026-03-12T10:00:00.000Z',
      submitted_at: '2026-03-12T10:00:00.000Z',
      submitter_firstname: 'Kabelo',
      submitter_surname: 'Phiri',
      lecturer_firstname: 'Boitumelo',
      lecturer_surname: 'Mothobi'
    },
    {
      publication_id: 'PUB-FALLBACK-02',
      publication_reference: 'UB-PUB-2026-B202',
      title: 'Deep Learning Approaches for Setswana Acoustic Modeling in Low-Resource Automatic Speech Recognition',
      abstract: 'End-to-end neural acoustic architectures fine-tuned on native conversational Setswana audio samples collected across Gaborone and Serowe.',
      keywords: 'Artificial Intelligence, Speech Recognition, Setswana NLP, Machine Learning',
      status: 'Approved',
      publication_type: 'Conference Paper',
      academic_level: 'Undergraduate',
      authors: ['L. Kgosi', 'Dr. B. Mothobi'],
      created_at: '2026-04-18T14:30:00.000Z',
      submitted_at: '2026-04-18T14:30:00.000Z',
      submitter_firstname: 'Lesego',
      submitter_surname: 'Kgosi',
      lecturer_firstname: 'Boitumelo',
      lecturer_surname: 'Mothobi'
    },
    {
      publication_id: 'PUB-FALLBACK-03',
      publication_reference: 'UB-PUB-2025-C303',
      title: 'Decentralized Electronic Health Records Architecture Compliant with Botswana Data Protection Act',
      abstract: 'A privacy-preserving distributed ledger framework enabling inter-clinic patient record exchange across district hospitals.',
      keywords: 'Blockchain, Healthcare, Cloud Security, Health Informatics',
      status: 'Approved',
      publication_type: 'Thesis',
      academic_level: "Master's",
      authors: ['T. Moeti', 'Prof. K. Modise'],
      created_at: '2025-11-20T09:15:00.000Z',
      submitted_at: '2025-11-20T09:15:00.000Z',
      submitter_firstname: 'Thato',
      submitter_surname: 'Moeti',
      lecturer_firstname: 'Kagiso',
      lecturer_surname: 'Modise'
    },
    {
      publication_id: 'PUB-FALLBACK-04',
      publication_reference: 'UB-PUB-2025-D404',
      title: 'Automated Cyber Threat Classification using Naive Bayes in SADC Telecommunications Networks',
      abstract: 'High-throughput packet stream anomaly detection tailored for southern African ISP backbone links and regional enterprise transit.',
      keywords: 'Cybersecurity, Machine Learning, Telecommunications, Network Security',
      status: 'Approved',
      publication_type: 'Conference Paper',
      academic_level: 'Undergraduate',
      authors: ['A. Molefe', 'M. Tau'],
      created_at: '2025-08-14T11:00:00.000Z',
      submitted_at: '2025-08-14T11:00:00.000Z',
      submitter_firstname: 'Archie',
      submitter_surname: 'Molefe',
      lecturer_firstname: 'M.',
      lecturer_surname: 'Tau'
    },
    {
      publication_id: 'PUB-FALLBACK-05',
      publication_reference: 'UB-PUB-2026-E505',
      title: 'Blockchain Protocol for Academic Credential Verification at University of Botswana',
      abstract: 'Cryptographically verifiable degree attestation smart contracts deployed on a private consortium blockchain.',
      keywords: 'Blockchain, Identity, Higher Education, Cryptography',
      status: 'Approved',
      publication_type: 'Journal Article',
      academic_level: 'PhD',
      authors: ['Dr. B. Mothobi', 'Prof. K. Modise'],
      created_at: '2026-02-10T16:00:00.000Z',
      submitted_at: '2026-02-10T16:00:00.000Z',
      submitter_firstname: 'Faculty',
      submitter_surname: 'Research',
      lecturer_firstname: 'Kagiso',
      lecturer_surname: 'Modise'
    },
    {
      publication_id: 'PUB-FALLBACK-06',
      publication_reference: 'UB-PUB-2025-F606',
      title: 'IoT-Enabled Soil Moisture & Meteorological Telemetry for Precision Agriculture in Kalahari Basin',
      abstract: 'LoRaWAN sensor nodes measuring volumetric water content and solar radiation for drought mitigation in communal cattle posts.',
      keywords: 'Internet of Things, Precision Agriculture, LoRaWAN, Climate Adaptation',
      status: 'Approved',
      publication_type: 'Dissertation',
      academic_level: 'PhD',
      authors: ['T. Ndlovu', 'Dr. P. Tau'],
      created_at: '2025-06-25T08:30:00.000Z',
      submitted_at: '2025-06-25T08:30:00.000Z',
      submitter_firstname: 'Tapiwa',
      submitter_surname: 'Ndlovu',
      lecturer_firstname: 'P.',
      lecturer_surname: 'Tau'
    },
    {
      publication_id: 'PUB-FALLBACK-07',
      publication_reference: 'UB-PUB-2024-G707',
      title: 'Hybrid Cloud Migration Strategies for Public Sector Universities in Southern Africa',
      abstract: 'Institutional evaluation of multi-tenant cloud cost optimization, latency considerations, and data sovereignty compliance.',
      keywords: 'Cloud Computing, IT Infrastructure, Governance, Data Sovereignty',
      status: 'Approved',
      publication_type: 'Journal Article',
      academic_level: "Master's",
      authors: ['K. Ditlhotlhole', 'M. Tau'],
      created_at: '2024-10-15T13:45:00.000Z',
      submitted_at: '2024-10-15T13:45:00.000Z',
      submitter_firstname: 'Keletso',
      submitter_surname: 'Ditlhotlhole',
      lecturer_firstname: 'M.',
      lecturer_surname: 'Tau'
    },
    {
      publication_id: 'PUB-FALLBACK-08',
      publication_reference: 'UB-PUB-2024-H808',
      title: 'Epidemiological Data Modeling and Spatial Analysis for Vector-Borne Diseases in Chobe District',
      abstract: 'Geographic information systems and predictive Bayesian modeling of seasonal malaria and tick-borne pathogen incidence in northern wetlands.',
      keywords: 'Public Health, GIS, Data Modeling, Epidemiology',
      status: 'Approved',
      publication_type: 'Journal Article',
      academic_level: 'PhD',
      authors: ['Dr. N. Sebego', 'Dr. B. Mothobi'],
      created_at: '2024-04-19T09:00:00.000Z',
      submitted_at: '2024-04-19T09:00:00.000Z',
      submitter_firstname: 'Naledi',
      submitter_surname: 'Sebego',
      lecturer_firstname: 'Boitumelo',
      lecturer_surname: 'Mothobi'
    }
  ];

  // Approved publications pool
  readonly allApprovedPublications = computed<Publication[]>(() => {
    const raw = this.rawPublications();
    const approved = raw.filter(
      p => (p.status || '').trim().toLowerCase() === 'approved'
    );
    if (approved.length > 0) {
      return approved;
    }
    return this.fallbackApprovedPublications;
  });

  // Dataset selected for report calculation
  readonly reportDataset = computed<Publication[]>(() => {
    if (this.analyticsScope() === 'filtered') {
      const filtered = this.filteredPublications();
      return filtered.length > 0 ? filtered : this.allApprovedPublications();
    }
    return this.allApprovedPublications();
  });

  // Computed visual metrics and graph data
  readonly reportStats = computed(() => {
    const pubs = this.reportDataset();
    const total = pubs.length;

    // 1. Publication Type Breakdown
    const typeConfigs = [
      { type: 'Journal Article', label: 'Journal Article', icon: '📄', color: '#800020' },
      { type: 'Conference Paper', label: 'Conference Paper', icon: '🎤', color: '#0d9488' },
      { type: 'Thesis', label: "Thesis (Master's)", icon: '🎓', color: '#d97706' },
      { type: 'Dissertation', label: 'Dissertation (PhD)', icon: '🏛️', color: '#7c3aed' },
      { type: 'Other', label: 'Book / Technical Report', icon: '📑', color: '#64748b' }
    ];

    const typeCounts: Record<string, number> = {};
    for (const p of pubs) {
      const t = (p.publication_type || '').trim().toLowerCase();
      if (t.includes('journal')) typeCounts['Journal Article'] = (typeCounts['Journal Article'] || 0) + 1;
      else if (t.includes('conference')) typeCounts['Conference Paper'] = (typeCounts['Conference Paper'] || 0) + 1;
      else if (t.includes('thesis')) typeCounts['Thesis'] = (typeCounts['Thesis'] || 0) + 1;
      else if (t.includes('dissertation')) typeCounts['Dissertation'] = (typeCounts['Dissertation'] || 0) + 1;
      else typeCounts['Other'] = (typeCounts['Other'] || 0) + 1;
    }

    const circumference = 2 * Math.PI * 38; // ~238.761
    let accumulatedOffset = 0;

    const types: TypeReportItem[] = typeConfigs.map(cfg => {
      const count = typeCounts[cfg.type] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      const sliceLength = (percentage / 100) * circumference;
      const dashArray = `${sliceLength} ${circumference}`;
      const dashOffset = -accumulatedOffset;
      accumulatedOffset += sliceLength;

      return {
        type: cfg.type,
        label: cfg.label,
        count,
        percentage,
        color: cfg.color,
        icon: cfg.icon,
        dashArray,
        dashOffset
      };
    });

    // 2. Academic Level Breakdown
    const levelConfigs = [
      { key: 'undergrad', label: 'Undergraduate (Final Year)', color: '#0284c7' },
      { key: 'masters', label: "Master's (Postgraduate)", color: '#d97706' },
      { key: 'phd', label: 'Doctoral (PhD)', color: '#7c3aed' },
      { key: 'faculty', label: 'Faculty & Postdoctoral', color: '#800020' }
    ];

    const levelCounts: Record<string, number> = { undergrad: 0, masters: 0, phd: 0, faculty: 0 };
    for (const p of pubs) {
      const lvl = `${p.academic_level || ''} ${p.submitter_academic_level || ''} ${p.publication_type || ''}`.toLowerCase();
      if (lvl.includes('phd') || lvl.includes('doctoral') || lvl.includes('dissertation')) {
        levelCounts['phd']++;
      } else if (lvl.includes('master') || lvl.includes('msc') || lvl.includes('thesis')) {
        levelCounts['masters']++;
      } else if (lvl.includes('undergrad') || lvl.includes('bsc') || lvl.includes('bachelor')) {
        levelCounts['undergrad']++;
      } else {
        levelCounts['faculty']++;
      }
    }

    const academicLevels: AcademicLevelItem[] = levelConfigs.map(cfg => {
      const count = levelCounts[cfg.key] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      const barHeight = Math.max(12, Math.round((percentage / 100) * 110));
      return {
        level: cfg.key,
        label: cfg.label,
        count,
        percentage,
        color: cfg.color,
        barHeight
      };
    });

    // 3. Yearly Timeline Trends
    const yearCounts: Record<string, number> = {};
    for (const p of pubs) {
      const dateStr = p.submitted_at || p.created_at;
      let yr = '2026';
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getFullYear())) {
          yr = String(d.getFullYear());
        }
      }
      yearCounts[yr] = (yearCounts[yr] || 0) + 1;
    }

    const distinctYears = ['2023', '2024', '2025', '2026'];
    const maxYearCount = Math.max(...distinctYears.map(y => yearCounts[y] || 0), 1);

    const timeline: TimelineItem[] = distinctYears.map(y => {
      const count = yearCounts[y] || 0;
      const percentage = Math.round((count / (total || 1)) * 100);
      const barHeight = Math.max(14, Math.round((count / maxYearCount) * 100));
      return {
        period: y,
        count,
        percentage,
        barHeight
      };
    });

    // 4. Keywords Frequency
    const kwMap: Record<string, number> = {};
    for (const p of pubs) {
      if (p.keywords) {
        const split = p.keywords.split(/[,;]+/).map(k => k.trim()).filter(Boolean);
        for (const kw of split) {
          const cap = kw.charAt(0).toUpperCase() + kw.slice(1);
          kwMap[cap] = (kwMap[cap] || 0) + 1;
        }
      }
    }

    const topKeywords: KeywordStat[] = Object.entries(kwMap)
      .map(([keyword, count]) => ({
        keyword,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 5. Author Collaboration Metrics
    let multiAuthor = 0;
    let singleAuthor = 0;
    const authorSet = new Set<string>();

    for (const p of pubs) {
      let authorCount = 1;
      if (Array.isArray(p.authors)) {
        authorCount = p.authors.length;
        p.authors.forEach(a => authorSet.add(a.trim().toLowerCase()));
      } else if (typeof p.authors === 'string') {
        const parts = (p.authors as string).split(/[,;]+/).filter(Boolean);
        authorCount = parts.length;
        parts.forEach(a => authorSet.add(a.trim().toLowerCase()));
      }
      if (authorCount > 1) multiAuthor++;
      else singleAuthor++;
    }

    const multiAuthorPercentage = total > 0 ? Math.round((multiAuthor / total) * 100) : 0;

    return {
      total,
      types,
      academicLevels,
      timeline,
      topKeywords,
      collaboration: {
        multiAuthor,
        singleAuthor,
        multiAuthorPercentage,
        uniqueAuthors: Math.max(authorSet.size, total)
      }
    };
  });

  // Debounced search subject
  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];

  // Active publication for Modal / Detail view
  selectedPublication = signal<Publication | null>(null);
  isModalOpen = signal(false);

  // PDF Viewer within Modal / Detail view
  pdfBlobUrl = signal<string | null>(null);
  safePdfUrl = signal<SafeResourceUrl | null>(null);
  pdfLoading = signal(false);
  pdfError = signal('');
  showPdfViewer = signal(false);

  // Copy feedback tooltip
  copiedReference = signal(false);

  // Filtered & sorted publications (instant reactive client + server filtering)
  filteredPublications = computed<Publication[]>(() => {
    let list = [...this.rawPublications()];
    const query = this.searchTerm().trim().toLowerCase();
    const typeFilter = this.selectedType().trim().toLowerCase();
    const sortOrder = this.selectedSort();

    // 0. Guests and Students only see Approved publications
    const isStaff = this.authService.hasAnyRole('lecturer', 'reviewer', 'admin');
    if (!isStaff) {
      list = list.filter(pub => (pub.status || '').trim().toLowerCase() === 'approved');
    }

    // 1. Text Search Filter across title, reference, abstract, keywords, authors, submitter
    if (query) {
      list = list.filter(pub => {
        const titleMatch = (pub.title || '').toLowerCase().includes(query);
        const refMatch = (pub.publication_reference || '').toLowerCase().includes(query);
        const abstractMatch = (pub.abstract || '').toLowerCase().includes(query);
        const kwMatch = (pub.keywords || '').toLowerCase().includes(query);
        const submitterMatch = `${pub.submitter_firstname || ''} ${pub.submitter_surname || ''}`.toLowerCase().includes(query);

        let authorsMatch = false;
        if (Array.isArray(pub.authors)) {
          authorsMatch = pub.authors.some(a => (a || '').toLowerCase().includes(query));
        } else if (typeof pub.authors === 'string') {
          authorsMatch = (pub.authors as string).toLowerCase().includes(query);
        }

        return titleMatch || refMatch || abstractMatch || kwMatch || submitterMatch || authorsMatch;
      });
    }

    // 2. Publication Type Filter
    if (typeFilter && typeFilter !== 'all') {
      list = list.filter(pub => (pub.publication_type || '').toLowerCase() === typeFilter);
    }

    // 3. Sorting
    list.sort((a, b) => {
      if (sortOrder === 'oldest') {
        const timeA = new Date(a.submitted_at || a.created_at || 0).getTime();
        const timeB = new Date(b.submitted_at || b.created_at || 0).getTime();
        return timeA - timeB;
      }
      if (sortOrder === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortOrder === 'title_desc') {
        return (b.title || '').localeCompare(a.title || '');
      }
      if (sortOrder === 'reference_asc') {
        return (a.publication_reference || '').localeCompare(b.publication_reference || '');
      }
      // default: newest
      const timeA = new Date(a.submitted_at || a.created_at || 0).getTime();
      const timeB = new Date(b.submitted_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });

    return list;
  });

  // Total count of matching publications
  total = computed(() => this.filteredPublications().length);

  // Total pages
  totalPages = computed(() => Math.max(Math.ceil(this.total() / this.pageSize()), 1));

  // Current page sliced items for rendering
  publications = computed<Publication[]>(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredPublications().slice(start, start + this.pageSize());
  });

  // Computed ranges for pagination info
  rangeStart = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1));
  rangeEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  // Active filters indicator
  hasActiveFilters = computed(() => {
    return (
      this.searchTerm().trim().length > 0 ||
      this.selectedType() !== 'all' ||
      this.selectedSort() !== 'newest'
    );
  });

  // Available options
  readonly publicationTypes = [
    { label: 'All Types', value: 'all' },
    { label: 'Journal Article', value: 'Journal Article' },
    { label: 'Conference Paper', value: 'Conference Paper' },
    { label: "Thesis (Master's)", value: 'Thesis' },
    { label: 'Dissertation (PhD)', value: 'Dissertation' }
  ];

  readonly sortOptions = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Oldest First', value: 'oldest' },
    { label: 'Title (A–Z)', value: 'title_asc' },
    { label: 'Title (Z–A)', value: 'title_desc' },
    { label: 'Reference Number', value: 'reference_asc' }
  ];

  ngOnInit(): void {
    // Setup debounced search typing
    const searchSub = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(val => {
        this.updateQueryParams({ search: val || null, page: 1 });
      });
    this.subscriptions.push(searchSub);

    // Read route query params on initialization and changes
    let initialLoadDone = false;
    const routeSub = this.route.queryParamMap.subscribe(params => {
      const qSearch = params.get('search') || '';
      const qType = params.get('type') || 'all';
      const qSort = params.get('sort') || 'newest';
      const qPage = Number(params.get('page')) || 1;
      const qLimit = Number(params.get('limit')) || 10;
      const qPubId = params.get('id');

      this.searchTerm.set(qSearch);
      this.selectedType.set(qType);
      this.selectedSort.set(qSort);
      this.page.set(qPage > 0 ? qPage : 1);
      this.pageSize.set(qLimit > 0 ? qLimit : 10);

      if (!isPlatformBrowser(this.platformId)) {
        this.isLoading.set(false);
        return;
      }

      if (!initialLoadDone) {
        initialLoadDone = true;
        this.loadPublications(qPubId);
      } else if (qPubId && (!this.selectedPublication() || this.selectedPublication()?.publication_id !== qPubId)) {
        const match = this.rawPublications().find(p => p.publication_id === qPubId);
        if (match) {
          this.openPublicationDetails(match);
        }
      }
    });
    this.subscriptions.push(routeSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.cleanupPdfUrl();
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.page.set(1);
    this.updateQueryParams({ search: null, page: 1 });
  }

  onTypeChange(type: string): void {
    this.selectedType.set(type);
    this.page.set(1);
    this.updateQueryParams({ type: type === 'all' ? null : type, page: 1 });
  }

  onSortChange(sort: string): void {
    this.selectedSort.set(sort);
    this.page.set(1);
    this.updateQueryParams({ sort: sort === 'newest' ? null : sort, page: 1 });
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.updateQueryParams({ limit: size === 10 ? null : size, page: 1 });
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.updateQueryParams({ page: p });
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  resetAllFilters(): void {
    this.searchTerm.set('');
    this.selectedType.set('all');
    this.selectedSort.set('newest');
    this.page.set(1);
    this.updateQueryParams({
      search: null,
      type: null,
      sort: null,
      page: 1,
      id: null
    });
  }

  filterByKeyword(keyword: string): void {
    this.searchTerm.set(keyword);
    this.page.set(1);
    this.updateQueryParams({ search: keyword, page: 1 });
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  toggleViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  // Analytics Report Actions
  toggleAnalytics(): void {
    this.showAnalytics.update(v => !v);
  }

  setAnalyticsScope(scope: 'approved' | 'filtered'): void {
    this.analyticsScope.set(scope);
  }

  filterByTypeFromGraph(type: string): void {
    this.onTypeChange(type);
    if (isPlatformBrowser(this.platformId)) {
      const el = document.getElementById('publications-results-anchor');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  filterByKeywordFromGraph(kw: string): void {
    this.filterByKeyword(kw);
  }

  printReport(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.print();
    }
  }

  // Publication Modal Details
  openPublicationDetails(pub: Publication): void {
    this.selectedPublication.set(pub);
    this.isModalOpen.set(true);
    this.showPdfViewer.set(false);
    this.cleanupPdfUrl();

    // Update URL query param quietly for deep linking
    this.updateQueryParams({ id: pub.publication_id });
  }

  closePublicationDetails(): void {
    this.isModalOpen.set(false);
    this.selectedPublication.set(null);
    this.cleanupPdfUrl();
    this.updateQueryParams({ id: null });
  }

  // Load publication document PDF
  togglePdfViewer(pub: Publication): void {
    if (this.showPdfViewer()) {
      this.showPdfViewer.set(false);
      return;
    }

    if (this.safePdfUrl()) {
      this.showPdfViewer.set(true);
      return;
    }

    this.pdfLoading.set(true);
    this.pdfError.set('');

    this.publicationService.getFile(pub.publication_id).subscribe({
      next: (blob: Blob) => {
        this.cleanupPdfUrl();
        const objectUrl = URL.createObjectURL(blob);
        this.pdfBlobUrl.set(objectUrl);
        this.safePdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl));
        this.showPdfViewer.set(true);
        this.pdfLoading.set(false);
      },
      error: () => {
        // Fallback try review endpoint if needed
        this.publicationService.getPubFile(pub.publication_id).subscribe({
          next: (blob: Blob) => {
            this.cleanupPdfUrl();
            const objectUrl = URL.createObjectURL(blob);
            this.pdfBlobUrl.set(objectUrl);
            this.safePdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl));
            this.showPdfViewer.set(true);
            this.pdfLoading.set(false);
          },
          error: (fallbackErr) => {
            console.error('Fallback file fetch error', fallbackErr);
            this.pdfError.set('Could not load the publication document. The file may not be uploaded yet.');
            this.pdfLoading.set(false);
          }
        });
      }
    });
  }

  downloadPublicationFile(pub: Publication, event?: Event): void {
    if (event) event.stopPropagation();

    this.publicationService.getFile(pub.publication_id).subscribe({
      next: (blob: Blob) => {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = pub.original_filename || `${pub.publication_reference || 'publication'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
      error: () => {
        // Fallback to review endpoint
        this.publicationService.getPubFile(pub.publication_id).subscribe({
          next: (blob: Blob) => {
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = pub.original_filename || `${pub.publication_reference || 'publication'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          },
          error: () => {
            alert('The publication document is currently unavailable for download.');
          }
        });
      }
    });
  }

  copyReference(reference: string, event?: Event): void {
    if (event) event.stopPropagation();
    if (!reference) return;

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(reference).then(() => {
        this.copiedReference.set(true);
        setTimeout(() => this.copiedReference.set(false), 2000);
      });
    }
  }

  splitKeywords(keywords: string | null | undefined): string[] {
    if (!keywords) return [];
    return keywords.split(/[,;]+/).map(k => k.trim()).filter(Boolean);
  }

  formatAuthors(authors: any): string {
    if (!authors) return 'Not specified';
    if (Array.isArray(authors)) {
      return authors.length > 0 ? authors.join(', ') : 'Not specified';
    }
    return String(authors);
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  formatPublicationType(type?: string): string {
    if (!type) return 'N/A';
    const lower = type.trim().toLowerCase();
    if (lower === 'thesis') return "Thesis (Master's)";
    if (lower === 'dissertation') return 'Dissertation (PhD)';
    return type;
  }

  private loadPublications(openPubId?: string | null): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    // Fetch the full list so client-side search, filter, sort, total count, and pagination slice operate over all records
    this.publicationService
      .fetchAllPublications()
      .subscribe({
        next: (res) => {
          this.rawPublications.set(res.publications || []);
          this.isLoading.set(false);

          // Deep link support: open modal if id query param matches
          if (openPubId && (!this.selectedPublication() || this.selectedPublication()?.publication_id !== openPubId)) {
            const match = (res.publications || []).find(p => p.publication_id === openPubId);
            if (match) {
              this.openPublicationDetails(match);
            } else {
              this.publicationService.fetchPublicationById(openPubId).subscribe({
                next: (singlePub) => {
                  if (singlePub) {
                    this.selectedPublication.set(singlePub as unknown as Publication);
                    this.isModalOpen.set(true);
                  }
                },
                error: (err) => console.warn('Could not load publication for deep link', err)
              });
            }
          }
        },
        error: (err) => {
          console.error('Failed to load publications', err);
          this.errorMessage.set('Failed to load publications. Please check your network connection and try again.');
          this.isLoading.set(false);
        }
      });
  }

  private updateQueryParams(params: Record<string, any>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private cleanupPdfUrl(): void {
    if (this.pdfBlobUrl()) {
      URL.revokeObjectURL(this.pdfBlobUrl()!);
      this.pdfBlobUrl.set(null);
    }
    this.safePdfUrl.set(null);
    this.pdfError.set('');
    this.pdfLoading.set(false);
  }
}
