// /review-publication-detail.ts

import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicationService } from '../../services/publication.service';
import { PubStatus, ReviewComment, ReviewDetail } from '../../models/publication.model';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  imports: [RouterLink, ReactiveFormsModule, DatePipe],
  selector: 'app-review-publication-detail',
  styleUrl: './review-publication-detail.scss',
  templateUrl: './review-publication-detail.html',
})

export class ReviewPublicationDetail implements OnInit, OnDestroy {
  // Kept so the existing template (pub.title, pub.authors, ...) keeps working.
  // It now holds the publication loaded from the API, not history.state.
  pub: any = null;
  publicationId: string | null = null;

  // Full publication (with lecturer, submitter and status history) from the API
  publication = signal<ReviewDetail | null>(null);
  loading = signal(true);
  loadError = signal('');

  // Approve / reject only make sense while the publication is pending
  canDecide = computed(() => {
    const s = this.publication()?.status.toLowerCase();
    return s === 'pending' || s === 'submitted';
  });
  // Withdraw is only offered for approved publications
  canWithdraw = computed(() => this.publication()?.status.toLowerCase() === 'approved');

  // Toggle show form for reviewer comments
  showForm: boolean = false;
  comments = signal<ReviewComment[]>([]);
  savingComment = signal(false);
  commentError = signal('');

  commentForm = new FormGroup({
    title: new FormControl(
      '',
      {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.maxLength(150)
        ]
      }
    ),
    details: new FormControl(
      '',
      {
        nonNullable: true,
        validators: [Validators.required]
      }
    )
  });

  // Show PDF
  private objectUrl: string | null = null;
  pdfUrl = signal<SafeResourceUrl | null>(null);
  showPdf = signal(false);
  pdfLoading = signal(false);
  pdfError = signal('');

  // Signals
  status = signal('');
  message = signal('');
  error = signal('');

  constructor(
    private route: ActivatedRoute,
    private publicationService: PublicationService,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.publicationId = id;

    if (isPlatformBrowser(this.platformId)) {
      // Show what the list passed along immediately, as the old page did
      const passed = history.state?.publication ?? null;
      if (passed) {
        this.pub = passed;
        this.publication.set(passed);
        this.status.set(passed.status);
      }
      this.loadComments();
    }

    // Then load the full record (supervisor, status history) from the server.
    // This also makes the page work after a refresh or when opened by its URL.
    this.publicationService.fetchReviewDetail(id).subscribe({
      next: p => {
        this.pub = p;
        this.publication.set(p);
        this.status.set(p.status);
      },
      error: err => console.log('Failed to load publication', err)
    });
  }

  /**
   * Negate the current value of showForm.
   *
   * e.g., if this.showForm is true, it then negated to false.
   */
  toggleForm(): void {
    this.showForm = !this.showForm;
  }

  /**
   * Load available comments
   */
  loadComments(): void {
    if (!this.publicationId) return;

    this.publicationService
      .getComments(this.publicationId)
      .subscribe({
        next: list => this.comments.set(list),
        error: err => {
          console.log('Failed to load review comments', err);
          this.commentError.set('Failed to load review comments');
        }
      });
  }

  /**
   * Cancel a comment
   */
  cancelComment(): void {
    this.commentForm.reset();
    this.showForm = false;
    this.commentError.set('');
  }

  /**
   * Submit and register review comments
   */
  submitComment(): void {
    if (!this.publicationId || this.savingComment()) return;

    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    this.savingComment.set(true);
    this.commentError.set('');

    this.publicationService
      .addComment(this.publicationId, this.commentForm.getRawValue())
      .subscribe({
        next: created => {
          // Newest first, same order the API returns them in
          this.comments.update(list => [created, ...list]);
          this.commentForm.reset();
          this.showForm = false;
          this.savingComment.set(false);
        },
        error: err => {
          console.log('Error saving review comment!', err);
          this.commentError.set(err.error?.message ?? 'Failed to save comment. Please try again.');
          this.savingComment.set(false);
        }
      });
  }

  onShowPub(): void {
    if (!this.publicationId) return;

    // PDF already loaded once: just show or hide it
    if (this.pdfUrl()) {
      this.showPdf.update(v => !v);
      return;
    }

    this.pdfLoading.set(true);
    this.pdfError.set('');
    this.publicationService.getPubFile(this.publicationId)
      .subscribe({
        next: blob => {
          this.objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
          this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
          this.showPdf.set(true);
          this.pdfLoading.set(false);
        },
        error: () => {
          this.pdfError.set('Could not load the document');
          this.pdfLoading.set(false);
        }
      });
  }

  onApprove(): void {
    this.onChangeStatus('approved');
  }

  onReject(): void {
    this.onChangeStatus('rejected');
  }

  onWithdraw(): void {
    // confirm() only exists in the browser, not during server-side rendering
    if (isPlatformBrowser(this.platformId) && !confirm('Withdraw this publication?')) return;
    this.onChangeStatus('withdrawn');
  }

  onChangeStatus(status: PubStatus | 'withdrawn'): void {
    if (!this.publicationId) return;

    this.message.set('');
    this.error.set('');

    this.publicationService.updatePubStatus(this.publicationId, status)
      .subscribe({
        next: res => {
          this.status.set(res.status);
          // Keep the displayed publication in step so the buttons update
          this.publication.update(p => p ? { ...p, status: res.status } : p);
          if (this.pub) this.pub = { ...this.pub, status: res.status };

          const labels: Record<string, string> = {
            approved: 'Publication approved',
            rejected: 'Publication rejected',
            withdrawn: 'Publication withdrawn'
          };
          this.message.set(labels[status] ?? 'Status updated');
        },
        error: err => {
          console.log('Failed to update publication status', err);
          this.error.set(err.error?.error ?? 'The status could not be updated at this time. Please try again later.');
        }
      });
  }

  ngOnDestroy(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }
}