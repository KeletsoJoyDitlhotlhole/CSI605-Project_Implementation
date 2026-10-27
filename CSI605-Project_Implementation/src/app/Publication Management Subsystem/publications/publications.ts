import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PublicationService } from '../../services/publication.service';

@Component({
  imports: [RouterLink],
  selector: 'app-publications',
  styleUrl: './publications.scss',
  templateUrl: './publications.html',
})

/**
 * Landing page.
 * 
 * Show featured publications to signed and guest users
 */
export class Publications implements OnInit {
  private router = inject(Router);
  private publicationService = inject(PublicationService);

  // the many publication that should be featured
  // this is best set in an enviromental file instead of being hardcoded here
  private readonly FEATURED_PUBLICATIONS_NUMBER = 4;

  approved: any = null; 
  query = signal("");
  featured = signal<any[]>([]);
  loading = signal(true);
  error = signal("");

  ngOnInit(): void {
    this.showFeaturePublications();
  }

  showFeaturePublications(): void {
    this.publicationService
      .fetchFeatured(this.FEATURED_PUBLICATIONS_NUMBER)
      .subscribe({
        next: res => {
          this.featured.set(res.publications);
          this.loading.set(false);
        },
        error: err => {
          console.log("Failed to load the featured publications", err);
          this.error.set("Failed to load the featured publications");
          this.loading.set(false);
        }
      });
  }

  /**
   * Capture what is typed in the search input elements
   * @param e Event object passed from the html component
   */
  onQueryInput(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
  }


  /**
   * Take the query string (stored in the query signal) and create a url query string that you 
   * can pass to 
   * @returns 
   */
  onSearch(): void {
    const q = this.query().trim(); // query created from search string store in the query (signal) variable
    if (!q) return;
    this.router.navigate(['/search-publications'], { queryParams: { q }});
  }
}
