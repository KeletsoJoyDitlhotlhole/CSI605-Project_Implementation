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
