import { Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicationService } from '../../services/publication.service';
import { ReviewPublication as ReviewPub } from '../../models/publication.model';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, map, switchMap } from 'rxjs';

@Component({
  imports: [RouterLink, CommonModule, FormsModule],
  selector: 'app-review-publication',
  styleUrl: './review-publication.scss',
  templateUrl: './review-publication.html',
})
export class ReviewPublication implements OnInit {
  private publicationService = inject(PublicationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  readonly pageSize = 10;

  rawPublications = signal<ReviewPub[]>([]);
  total = signal(0);
  page = signal(1);
  totalPages = signal(1);

  // Ordering & Filtering controls for Submitted Publications
  selectedSort = signal<string>('newest');
  selectedTypeFilter = signal<string>('all');
  selectedStatusFilter = signal<string>('all');
  searchTerm = signal<string>('');

  readonly sortOptions = [
    { label: 'Newest Submitted First', value: 'newest' },
    { label: 'Oldest Submitted First', value: 'oldest' },
    { label: 'Title (A–Z)', value: 'title_asc' },
    { label: 'Title (Z–A)', value: 'title_desc' },
    { label: 'Publication Type (A–Z)', value: 'type_asc' },
    { label: 'Review Status (Pending → Rejected)', value: 'status_asc' },
    { label: 'Submitter Name (A–Z)', value: 'submitter_asc' },
    { label: 'Reference Code (A–Z)', value: 'reference_asc' }
  ];

  // Client-side ordering & filtering over the fetched review queue
  publications = computed<ReviewPub[]>(() => {
    let list = [...this.rawPublications()];
    const q = this.searchTerm().trim().toLowerCase();
    const typeFilter = this.selectedTypeFilter().toLowerCase();
    const statusFilter = this.selectedStatusFilter().toLowerCase();
    const sort = this.selectedSort();

    if (q) {
      list = list.filter(p => {
        const title = (p.title || '').toLowerCase();
        const ref = (p.publication_reference || '').toLowerCase();
        const kw = (p.keywords || '').toLowerCase();
        const submitter = `${p.submitter_firstname || ''} ${p.submitter_surname || ''}`.toLowerCase();
        const authors = Array.isArray(p.authors) ? p.authors.join(' ').toLowerCase() : '';
        return title.includes(q) || ref.includes(q) || kw.includes(q) || submitter.includes(q) || authors.includes(q);
      });
    }

    if (typeFilter !== 'all') {
      list = list.filter(p => (p.publication_type || '').toLowerCase() === typeFilter);
    }

    if (statusFilter !== 'all') {
      list = list.filter(p => (p.status || '').toLowerCase() === statusFilter);
    }

    list.sort((a, b) => {
      const timeA = new Date(a.submitted_at || a.created_at || 0).getTime();
      const timeB = new Date(b.submitted_at || b.created_at || 0).getTime();
      switch (sort) {
        case 'oldest':
          return timeA - timeB;
        case 'title_asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title_desc':
          return (b.title || '').localeCompare(a.title || '');
        case 'type_asc':
          return (a.publication_type || '').localeCompare(b.publication_type || '') || (timeB - timeA);
        case 'status_asc':
          return (a.status || '').localeCompare(b.status || '') || (timeB - timeA);
        case 'submitter_asc': {
          const nameA = `${a.submitter_firstname || ''} ${a.submitter_surname || ''}`.trim();
          const nameB = `${b.submitter_firstname || ''} ${b.submitter_surname || ''}`.trim();
          return nameA.localeCompare(nameB);
        }
        case 'reference_asc':
          return (a.publication_reference || '').localeCompare(b.publication_reference || '');
        default: // newest
          return timeB - timeA;
      }
    });

    return list;
  });

  // "Showing 1–10 of 45"
  rangeStart = computed(() => (this.publications().length === 0 ? 0 : (this.page() - 1) * this.pageSize + 1));
  rangeEnd = computed(() => Math.min((this.page() - 1) * this.pageSize + this.publications().length, this.total()));

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.route.queryParamMap.pipe(
      map(params => ({
        page: this.parsePage(params.get("page")),
        sort: params.get("sort") || "newest"
      })),
      switchMap(({ page, sort }) => {
        this.selectedSort.set(sort);
        return this.publicationService.fetchReviewList(page, this.pageSize, sort).pipe(
          catchError(err => {
            console.error("The system failed to get review list", err);
            return EMPTY;
          })
        );
      })
    ).subscribe(res => {
      this.rawPublications.set(res.publications || []);
      this.total.set(res.total);
      this.page.set(res.page);
      this.totalPages.set(res.totalPages);

      if (res.publications.length === 0 && res.total > 0) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { page: res.totalPages, sort: this.selectedSort() },
          replaceUrl: true
        });
      }
    });
  }

  onSortChange(sort: string): void {
    this.selectedSort.set(sort);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: 1, sort: sort === 'newest' ? null : sort },
      queryParamsHandling: 'merge'
    });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedTypeFilter.set('all');
    this.selectedStatusFilter.set('all');
    this.onSortChange('newest');
  }

  splitKeywords(keywords: string): string[] {
    if (!keywords) return [];
    return keywords.split(/[,]+/).map(k => k.trim()).filter(Boolean);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page, sort: this.selectedSort() === 'newest' ? null : this.selectedSort() },
      queryParamsHandling: 'merge'
    });

    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0 });
    }
  }

  private parsePage(value: string | null): number {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : 1;
  }
}
