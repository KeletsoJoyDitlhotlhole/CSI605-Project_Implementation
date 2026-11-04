import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationBellComponent } from '../Notification/notification-bell.component';
import { ToastContainerComponent } from '../Notification/toast-container.component';
import { NotificationService } from '../../services/notification.service';

export interface PendingReviewItem {
  id: string;
  title: string;
  studentName: string;
  studentId: string;
  academicTrack: string;
  uploadedDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  abstract: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationBellComponent, ToastContainerComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  // Reviewer Profile
  readonly reviewer = {
    name: 'Dr. M. Tau',
    title: 'Senior Lecturer & Faculty Reviewer',
    department: 'Department of Computer Science',
    email: 'tau.m@ub.ac.bw'
  };

  // Review Queue State & Modal
  readonly isReviewModalOpen = signal<boolean>(false);
  readonly selectedReviewItem = signal<PendingReviewItem | null>(null);
  readonly reviewerFeedbackText = signal<string>('');
  readonly reviewDecisionSuccessMessage = signal<string>('');

  // Live pending review manuscripts list
  readonly pendingReviewList = signal<PendingReviewItem[]>([
    {
      id: 'PUB-2026-089',
      title: 'Deep Learning Approaches for Setswana Speech-to-Text Transcription',
      studentName: 'Lesego Kgosi',
      studentId: '202104589',
      academicTrack: 'Undergraduate Final Year',
      uploadedDate: 'Today (18 mins ago)',
      status: 'Pending',
      abstract: 'An investigation into acoustic model adaptation and fine-tuning for low-resource Bantu languages, focusing on conversational Setswana audio corpuses gathered across Botswana.'
    },
    {
      id: 'PUB-2026-094',
      title: 'IoT-Enabled Precision Irrigation Optimization in the Kalahari Basin',
      studentName: 'Tapiwa Ndlovu',
      studentId: '202008742',
      academicTrack: 'Postgraduate (MSc)',
      uploadedDate: 'Today (1.5 hrs ago)',
      status: 'Pending',
      abstract: 'Deployment of LoRaWAN-connected soil moisture telemetry probes with edge predictive irrigation analytics tailored to arid climatic constraints in agricultural zones.'
    },
    {
      id: 'PUB-2026-101',
      title: 'Securing Decentralized Electronic Health Records in Botswana Clinics',
      studentName: 'Thato Moeti',
      studentId: '202201334',
      academicTrack: 'Undergraduate Final Year',
      uploadedDate: 'Today (5 hrs ago)',
      status: 'Pending',
      abstract: 'An assessment of distributed ledger access control architectures compliant with national data protection regulations for patient medical records.'
    }
  ]);

  // Derived counts
  readonly activePendingCount = computed(() => {
    return this.notificationService.reviewerPendingCount();
  });

  readonly totalCompletedReviews = signal<number>(14);
  readonly totalRepositoryPublications = signal<number>(128);

  // Open review inspection modal
  openReviewInspection(item: PendingReviewItem): void {
    this.selectedReviewItem.set(item);
    this.reviewerFeedbackText.set('');
    this.reviewDecisionSuccessMessage.set('');
    this.isReviewModalOpen.set(true);
  }

  closeReviewModal(): void {
    this.isReviewModalOpen.set(false);
    this.selectedReviewItem.set(null);
  }

  /**
   * Complete review with acceptance or rejection:
   * When a lecturer reviews a publication and rejects or accepts it,
   * the notification immediately appears on the student's dashboard bell!
   */
  processReviewDecision(decision: 'accepted' | 'rejected'): void {
    const item = this.selectedReviewItem();
    if (!item) return;

    const feedback = this.reviewerFeedbackText().trim() ||
      (decision === 'accepted'
        ? 'Paper meets all scholarly standards and is approved for institutional archiving.'
        : 'Paper requires revisions: Please expand experimental data and update literature citations before resubmission.');

    // 1. Update item status in queue
    this.pendingReviewList.update(list =>
      list.map(p => (p.id === item.id ? { ...p, status: decision === 'accepted' ? 'Approved' : 'Rejected' } : p))
    );

    // 2. Mark corresponding reviewer notification read
    const reviewerNotif = this.notificationService
      .reviewerNotifications()
      .find(n => n.publicationTitle === item.title || n.publicationId === item.id);
    if (reviewerNotif) {
      this.notificationService.markAsRead(reviewerNotif.id);
    }

    // 3. Notify the STUDENT'S DASHBOARD BELL!
    // This increments the student's bell icon counter with the review decision.
    this.notificationService.reviewPublication(
      item.title,
      decision,
      `${this.reviewer.name} (${this.reviewer.title})`,
      feedback,
      item.id
    );

    this.totalCompletedReviews.update(c => c + 1);

    this.reviewDecisionSuccessMessage.set(
      `✓ Decision logged: Publication "${item.title}" was ${decision.toUpperCase()}! The Student's Dashboard bell has been notified.`
    );

    setTimeout(() => {
      this.closeReviewModal();
    }, 2000);
  }

  // Quick simulation triggers for demonstration
  simulateIncomingStudentUpload(): void {
    const titles = [
      'Evaluating Edge AI for Livestock Monitoring in the Central District',
      'Solar-Powered Aquaponics Telemetry Using Microcontrollers',
      'Sentiment Analysis of Setswana Social Media Posts'
    ];
    const students = [
      'Kagiso Mokgosi (StudentID: 202304118)',
      'Tumelo Sithole (StudentID: 202209931)',
      'Naledi Kebonye (StudentID: 202107724)'
    ];

    const idx = Math.floor(Math.random() * titles.length);
    const pubId = `PUB-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newItem: PendingReviewItem = {
      id: pubId,
      title: titles[idx],
      studentName: students[idx].split(' (')[0],
      studentId: students[idx].replace(/.*\((.*)\)/, '$1'),
      academicTrack: 'Undergraduate',
      uploadedDate: 'Just now',
      status: 'Pending',
      abstract: 'Fresh student manuscript upload for faculty peer review and evaluation.'
    };

    this.pendingReviewList.update(list => [newItem, ...list]);

    // Triggers notification to reviewer bell
    this.notificationService.uploadPublication(
      titles[idx],
      students[idx],
      pubId
    );
  }

  navigateToStudentDashboard(): void {
    this.router.navigate(['/student-dashboard']);
  }
}
