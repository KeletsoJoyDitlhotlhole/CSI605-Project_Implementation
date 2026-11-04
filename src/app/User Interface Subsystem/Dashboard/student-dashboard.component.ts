import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationBellComponent } from '../Notification/notification-bell.component';
import { ToastContainerComponent } from '../Notification/toast-container.component';
import { NotificationService } from '../../services/notification.service';

export interface StudentSubmission {
  id: string;
  title: string;
  academicLevel: string;
  reviewerName: string;
  submittedDate: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  feedback?: string;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationBellComponent, ToastContainerComponent],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.scss'
})
export class StudentDashboardComponent {
  readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  // Student profile mock
  readonly student = {
    name: 'Lesego Kgosi',
    id: '202104589',
    program: 'BSc Computer Science',
    department: 'Faculty of Science',
    email: '202104589@ub.ac.bw'
  };

  // Upload modal state
  readonly isUploadModalOpen = signal<boolean>(false);
  readonly uploadTitle = signal<string>('');
  readonly uploadLevel = signal<string>('Undergraduate');
  readonly uploadAbstract = signal<string>('');
  readonly uploadSuccessMessage = signal<string>('');

  // Sample student submission records
  readonly submissions = signal<StudentSubmission[]>([
    {
      id: 'PUB-2026-077',
      title: 'Renewable Solar Microgrid Feasibility in Rural Ngamiland',
      academicLevel: 'Postgraduate',
      reviewerName: 'Dr. Boitumelo Mothobi',
      submittedDate: '28 Oct 2026',
      status: 'Accepted',
      feedback: 'Excellent methodology and robust data collection. Manuscript approved for repository publishing.'
    },
    {
      id: 'PUB-2026-062',
      title: 'Automated Cyber Threat Classification using Naive Bayes Models',
      academicLevel: 'Undergraduate',
      reviewerName: 'Prof. Kagiso Modise',
      submittedDate: '24 Oct 2026',
      status: 'Rejected',
      feedback: 'Literature review is missing recent 2025/2026 citations, and validation sample size must be expanded. Please revise Section 3 and resubmit.'
    },
    {
      id: 'PUB-2026-089',
      title: 'Deep Learning Approaches for Setswana Speech-to-Text Transcription',
      academicLevel: 'Undergraduate',
      reviewerName: 'Dr. M. Tau (Pending Assignment)',
      submittedDate: '04 Nov 2026',
      status: 'Pending',
      feedback: 'Manuscript is in the reviewer queue awaiting evaluation.'
    }
  ]);

  // Derived metrics
  readonly acceptedCount = computed(() =>
    this.submissions().filter(s => s.status === 'Accepted').length
  );

  readonly pendingCount = computed(() =>
    this.submissions().filter(s => s.status === 'Pending').length
  );

  readonly rejectedCount = computed(() =>
    this.submissions().filter(s => s.status === 'Rejected').length
  );

  openUploadModal(): void {
    this.uploadTitle.set('');
    this.uploadAbstract.set('');
    this.uploadSuccessMessage.set('');
    this.isUploadModalOpen.set(true);
  }

  closeUploadModal(): void {
    this.isUploadModalOpen.set(false);
  }

  submitPublication(): void {
    const title = this.uploadTitle().trim();
    if (!title) return;

    const newPubId = `PUB-2026-${Math.floor(100 + Math.random() * 900)}`;

    // 1. Add to student submissions list
    const newSubmission: StudentSubmission = {
      id: newPubId,
      title,
      academicLevel: this.uploadLevel(),
      reviewerName: 'Assigned Faculty Reviewer',
      submittedDate: 'Today',
      status: 'Pending',
      feedback: 'Manuscript uploaded. Currently pending supervisor review.'
    };

    this.submissions.update(list => [newSubmission, ...list]);

    // 2. Trigger notification for the REVIEWER'S DASHBOARD!
    // This increments the reviewer's bell icon counter with the new pending review.
    this.notificationService.uploadPublication(
      title,
      `${this.student.name} (StudentID: ${this.student.id})`,
      newPubId
    );

    this.uploadSuccessMessage.set(
      `✓ Publication "${title}" uploaded successfully! The Reviewer's Dashboard has been notified with a pending review on their bell icon.`
    );

    setTimeout(() => {
      this.closeUploadModal();
    }, 2200);
  }

  // Demonstration helper
  simulateReviewResponse(status: 'Accepted' | 'Rejected'): void {
    const title = status === 'Accepted'
      ? 'Renewable Solar Microgrid Feasibility in Rural Ngamiland'
      : 'Automated Cyber Threat Classification using Naive Bayes Models';

    this.notificationService.reviewPublication(
      title,
      status === 'Accepted' ? 'accepted' : 'rejected',
      'Dr. Boitumelo Mothobi (Faculty Reviewer)',
      status === 'Accepted'
        ? 'Paper approved with distinction. Excellent methodology.'
        : 'Revisions requested in methodology section before final approval.'
    );
  }

  navigateToLecturerDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
