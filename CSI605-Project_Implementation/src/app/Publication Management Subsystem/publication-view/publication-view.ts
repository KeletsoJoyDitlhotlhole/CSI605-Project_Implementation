import { Component, Inject, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicationService } from '../../services/publication.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DatePipe, isPlatformBrowser } from '@angular/common';

@Component({
  imports: [RouterLink,DatePipe],
  selector: 'app-publication-view',
  styleUrl: './publication-view.scss',
  templateUrl: './publication-view.html',
})

/**
 * Build a publications view
 */
export class PublicationView implements OnInit {
  private route = inject(ActivatedRoute);
  private publicationService = inject(PublicationService);
  private sanitizer = inject(DomSanitizer);

  publicationId: string | null = null;
  pub = signal<any>(null);
  loading = signal(true);
  error = signal("");

  // Show PDF
  private objectUrl: string | null = null;
  pdfUrl = signal<SafeResourceUrl | null>(null);
  showPdf = signal(false);
  pdfLoading = signal(false);
  pdfError = signal('');

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {};

  ngOnInit(): void {
    this.publicationId = this.route.snapshot.paramMap.get('id');
    if (isPlatformBrowser(this.platformId)) {
      this.loadPublication();
    }
  }

  /**
   * Fetch the publication by the id in the URL, so the page also works
   * after a refresh or when opened from a shared link.
   */
  private loadPublication(): void {
    if (!this.publicationId) {
      this.error.set('No publication was selected.');
      this.loading.set(false);
      return;
    }
 
    this.publicationService.getPublication(this.publicationId).subscribe({
      next: res => {
        this.pub.set(res);
        this.loading.set(false);
      },
      error: err => {
        console.log('Failed to load publication', err);
        this.error.set(
          err.status === 404
            ? 'This publication could not be found.'
            : 'Could not load the publication. Please try again later.'
        );
        this.loading.set(false);
      }
    });
  }
 
  /** Show or hide the PDF; the file is only downloaded the first time. */
  onShowPub(): void {
    if (!this.publicationId) return;
 
    if (this.pdfUrl()) {
      this.showPdf.update(v => !v);
      return;
    }
 
    this.pdfLoading.set(true);
    this.pdfError.set('');
 
    this.publicationService.getPublicFile(this.publicationId).subscribe({
      next: blob => {
        this.objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
        this.showPdf.set(true);
        this.pdfLoading.set(false);
      },
      error: () => {
        this.pdfError.set('Could not load the document.');
        this.pdfLoading.set(false);
      }
    });
  }
 
  ngOnDestroy(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }
}
