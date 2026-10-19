import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicationService } from '../../services/publication.service';
import { PubStatus } from '../../models/publication.model';

@Component({
  imports: [RouterLink],
  selector: 'app-review-publication-detail',
  styleUrl: './review-publication-detail.scss',
  templateUrl: './review-publication-detail.html',
})
export class ReviewPublicationDetail implements OnInit {
  pub: any= null;
  publicationId: string | null = null;

  status = signal('');
  message = signal('');
  error = signal('');

  constructor(
    private route: ActivatedRoute,
    private publicationService: PublicationService,
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
    }
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
}
