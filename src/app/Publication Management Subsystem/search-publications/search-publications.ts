import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PublicationService } from '../../services/publication.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TextSegment } from '../../models/publication.model';

type SortOptions = "newest" | "oldest" | "title";

@Component({
  imports: [RouterLink],
  selector: 'app-search-publications',
  styleUrl: './search-publications.scss',
  templateUrl: './search-publications.html',
})
export class SearchPublications implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef)
  private publicationService = inject(PublicationService);

  searchText = signal("");
  query = signal("");
  sort = signal<SortOptions>("newest");
  page = signal(1);
  results = signal<any[]>([]);
  total = signal(0);
  totalPages = signal(1);
  loading = signal(true);
  error = signal("");

  // pagination buttons
  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  ngOnInit(): void {
    // runs every time the URL query string changes (new search, new page, new sort)
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const q = params.get('q') ?? '';
        const sort = params.get("sort");

        this.query.set(q);
        this.searchText.set(q);
        this.sort.set(sort === "oldest" || sort === 'title' ? sort : "newest");
        this.page.set(Math.max(parseInt(params.get("page") ?? "1", 10) || 1, 1));

        if (!q.trim()) {
          this.results.set([]);
          this.total.set(0);
          this.totalPages.set(1);
          this.error.set("");
          this.loading.set(false);
          return;
        }

        this.loadSearchedPublication();
      })
  }

  private loadSearchedPublication():void {
    this.loading.set(true);
    this.error.set("");

    this.publicationService
      .searchPublications(this.query(), this.page(), this.sort())
      .subscribe({
        next: res => {
          this.results.set(res.publications);
          this.total.set(res.total);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: err => {
          console.log("Search could not find the publication you are looking for", err);
          this.error.set("Search could not find the publication you are looking for");
          this.loading.set(false);
        }
      });
  }

  // changing the URL triggers the reload
  private updateUrl(params: { q?: string; sort?: string; page?: number}): void {
    this.router.navigate(
      [],
      {
        relativeTo: this.route,
        queryParams: params,
        queryParamsHandling: 'merge',
      }
    );
  }

  onSearchInput(e: Event): void {
    this.searchText.set((e.target as HTMLInputElement).value);
  }

  onSearch(): void {
    this.updateUrl({ q: this.searchText().trim(), page: 1 });
  }

  onSortChange(e: Event): void {
    this.updateUrl({sort: (e.target as HTMLSelectElement).value, page: 1 });
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.updateUrl({page: p});
    window.scrollTo({ top: 0, behavior: "smooth"});
  }

  highlight(text: string | null | undefined): TextSegment[] {
    const val = text ?? "";
    const q = this.query().trim();

    if (!q) return [{ text: val, match: false }]

    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = val.split(new RegExp(`(${esc})`))

    return parts
      .filter(part => part !== "")
      .map(part => ({ text: part, match: part.toLowerCase() === q.toLowerCase() }));
  }

  trackById = (_:number, pub: any) => pub.publication_id;
  
}
