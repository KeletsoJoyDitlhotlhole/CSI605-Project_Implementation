// /review-publication-detail.ts

import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicationService } from '../../services/publication.service';
import { PubStatus, ReviewComment } from '../../models/publication.model';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  imports: [RouterLink, ReactiveFormsModule],
  selector: 'app-review-publication-detail',
  styleUrl: './review-publication-detail.scss',
  templateUrl: './review-publication-detail.html',
})

export class ReviewPublicationDetail implements OnInit, OnDestroy {
  pub: any= null;
  publicationId: string | null = null;

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
    this.publicationId = this.route.snapshot.paramMap.get("id");
    // if (history.state && history.state.publication) {
    //   this.pub = history.state.publication;
    // }
    if (isPlatformBrowser(this.platformId)) {
      this.pub = history.state?.publication ?? null;
      this.status.set(this.pub?.status ?? '');
      this.loadComments();
    }
  }

  /**
   * Negate the current value of showForm.
   * 
   * e.g., if this.showForm is true, it then negated to false.
   */
  toggleForm():void {
    this.showForm = !this.showForm;
  }

  /**
   * Load avaialbe comments
   */
  loadComments(): void {
    if (!this.publicationId) return;

    this.publicationService
      .getComments(this.publicationId)
      .subscribe({
        next: list => this.comments.set(list),
        error: err => {
          console.log("Faile to loads review comments");
          this.commentError.set("Failed to load review comments");
        }
      })
  }

  /**
   * Cancel a comment
   */
  cancelComment():void {
    this.commentForm.reset();
    this.showForm = false;
    this.commentError.set('');
  }

  /**
   * Submit and register review comments
   */
  submitComment():void {
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
          this.comments.update(list => [...list, created]);
          this.commentForm.reset();
          this.showForm = false;
          this.savingComment.set(false);
        },
        error: err => {
          console.log("Error saving review comment!");
          this.commentError.set(err.error?.message ?? "Failed to save comment. Please try again.");
          this.savingComment.set(false);
        }
      });
  }

  onShowPub(): void {
    if (!this.publicationId) return;

    // if (this.showPdf) { 
    //   this.showPdf = false;
    //   return; 
    // }

    if (this.pdfUrl()) {
      this.showPdf.update(v => !v);
      return;
    }

    this.pdfLoading.set(true);
    this.pdfError.set('');
    this.publicationService.getPubFile(this.pub.publication_id)
      .subscribe({
        next: blob => {
          this.objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
          this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
          this.showPdf.set(true);
          this.pdfLoading.set(false);
        },
        error: () => {
          this.pdfError.set("Could not load the document");
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

  onChangeStatus(status: PubStatus):void {
    // makes this.publicationId string by default
    if (!this.publicationId) return;

    this.message.set('');
    this.error.set('');

    this.publicationService.updatePubStatus(
      this.publicationId,
      status
    )
    .subscribe({
      next: res => {
        this.status.set(res.status);
        this.message.set(status === 'approved' ? 'Publication approved' : 'Publication rejected')
      },
      error: err => {
        console.log('Failed to update publication status', err);
        this.error.set(err.error?.error ?? "The status could not be updated at this time. Please try again later.");
      }
    })
  }

  ngOnDestroy(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }
}
