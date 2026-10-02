import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { PublicationService } from '../../services/publication.service';
import { ReviewPublication as ReviewPub } from '../../models/publication.model';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { catchError, EMPTY, map, switchMap, tap } from 'rxjs';

@Component({
  imports: [RouterLink, DatePipe],
  selector: 'app-review-publication',
  styleUrl: './review-publication.scss',
  templateUrl: './review-publication.html',
})
export class ReviewPublication implements OnInit {
  // Dependency injection
  private publicationService = inject(PublicationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly pageSize = 10;

  publications = signal<ReviewPub[]>([]);
  total = signal(0);
  page = signal(1);
  totalPages = signal(1);

  // "Showing 11–20 of 45"
  rangeStart = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize + 1));
  rangeEnd = computed(() => Math.min(this.page() * this.pageSize, this.total()));

  ngOnInit(): void {
    this.route.queryParamMap.pipe(
      map(params => this.parsePage(params.get("page"))),
      tap(() => {}),
      switchMap(page => this.publicationService.fetchReviewList(page, this.pageSize).pipe(
        catchError(err => {
          console.error("The system failed to get review list", err);
          return EMPTY;
        })   
      ))
    ).subscribe(res => {
      this.publications.set(res.publications);
      this.total.set(res.total);
      this.page.set(res.page);
      this.totalPages.set(res.totalPages);

      if (res.publications.length === 0 && res.total > 0) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { page: res.totalPages },
          replaceUrl: true
        })
      }
    })
  }

  splitKeywords(keywords: string): string[] {
    return keywords.split(", ").map(k => k.trim()).filter(Boolean);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page }
    });

    window.scrollTo({ top: 0 });
  }

  private parsePage(value: string | null): number {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : 1;
  }
}
