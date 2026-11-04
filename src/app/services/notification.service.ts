import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NotificationItem, NotificationRole, ToastMessage } from '../models/notification.model';

const STORAGE_KEY = 'ub_pms_notifications_v1';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _notifications = signal<NotificationItem[]>([]);
  private readonly _toasts = signal<ToastMessage[]>([]);

  readonly allNotifications = computed(() => this._notifications());
  readonly toasts = computed(() => this._toasts());

  // Reviewer specific signals
  readonly reviewerNotifications = computed(() =>
    this._notifications().filter(n => n.recipientRole === 'reviewer')
  );

  readonly reviewerPendingCount = computed(() =>
    this._notifications().filter(n => n.recipientRole === 'reviewer' && !n.read).length
  );

  // Student specific signals
  readonly studentNotifications = computed(() =>
    this._notifications().filter(n => n.recipientRole === 'student')
  );

  readonly studentNotificationCount = computed(() =>
    this._notifications().filter(n => n.recipientRole === 'student' && !n.read).length
  );

  constructor() {
    this.initNotifications();
  }

  private initNotifications(): void {
    if (this.isBrowser) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this._notifications.set(parsed);
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to read notifications from localStorage', e);
      }
    }
    // Load default realistic initial notifications
    this.loadDefaultNotifications();
  }

  private saveToStorage(): void {
    if (this.isBrowser) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._notifications()));
      } catch (e) {
        console.warn('Failed to save notifications to localStorage', e);
      }
    }
  }

  private loadDefaultNotifications(): void {
    const defaults: NotificationItem[] = [
      // Initial pending reviews for Reviewers / Lecturers
      {
        id: 'rev-notif-1',
        recipientRole: 'reviewer',
        type: 'new_submission',
        title: 'New Publication Uploaded',
        message: 'A student has submitted a new research manuscript for faculty review and verification.',
        publicationId: 'PUB-2026-089',
        publicationTitle: 'Deep Learning Approaches for Setswana Speech-to-Text Transcription',
        studentName: 'Lesego Kgosi (Student ID: 202104589)',
        timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 mins ago
        read: false,
        actionUrl: '/review-publication'
      },
      {
        id: 'rev-notif-2',
        recipientRole: 'reviewer',
        type: 'new_submission',
        title: 'New Publication Uploaded',
        message: 'A postgraduate student uploaded an empirical thesis manuscript awaiting your supervisor review.',
        publicationId: 'PUB-2026-094',
        publicationTitle: 'IoT-Enabled Precision Irrigation Optimization in the Kalahari Basin',
        studentName: 'Tapiwa Ndlovu (Student ID: 202008742)',
        timestamp: new Date(Date.now() - 1000 * 60 * 85).toISOString(), // ~1.5 hours ago
        read: false,
        actionUrl: '/review-publication'
      },
      {
        id: 'rev-notif-3',
        recipientRole: 'reviewer',
        type: 'new_submission',
        title: 'New Publication Uploaded',
        message: 'Undergraduate final year project report submitted for departmental peer review.',
        publicationId: 'PUB-2026-101',
        publicationTitle: 'Securing Decentralized Electronic Health Records in Botswana Clinics',
        studentName: 'Thato Moeti (Student ID: 202201334)',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
        read: false,
        actionUrl: '/review-publication'
      },

      // Initial review decision notifications for Students
      {
        id: 'stud-notif-1',
        recipientRole: 'student',
        type: 'review_accepted',
        title: 'Publication Accepted',
        message: 'Congratulations! Your manuscript has been successfully accepted by your assigned reviewer.',
        publicationId: 'PUB-2026-077',
        publicationTitle: 'Renewable Solar Microgrid Feasibility in Rural Ngamiland',
        reviewerName: 'Dr. Boitumelo Mothobi (Department of Computer Science & Engineering)',
        feedback: 'Excellent methodology and robust data collection. Manuscript approved for repository publishing without amendments.',
        timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(), // 40 mins ago
        read: false
      },
      {
        id: 'stud-notif-2',
        recipientRole: 'student',
        type: 'review_rejected',
        title: 'Publication Rejected (Revisions Required)',
        message: 'Your publication was reviewed and rejected. Please review reviewer comments and resubmit with necessary revisions.',
        publicationId: 'PUB-2026-062',
        publicationTitle: 'Automated Cyber Threat Classification using Naive Bayes Models',
        reviewerName: 'Prof. Kagiso Modise (Faculty of Science)',
        feedback: 'The literature review is missing recent 2025/2026 citations, and validation sample size must be expanded. Please revise Section 3 and resubmit.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
        read: false
      }
    ];

    this._notifications.set(defaults);
    this.saveToStorage();
  }

  /**
   * Called when a student uploads a publication:
   * Adds a notification to the Reviewer's dashboard and increments their bell counter.
   */
  uploadPublication(
    publicationTitle: string,
    studentName: string = 'Kabelo Phiri (Student ID: 202301988)',
    publicationId?: string
  ): NotificationItem {
    const pubId = publicationId || `PUB-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newNotif: NotificationItem = {
      id: 'rev-notif-' + Date.now(),
      recipientRole: 'reviewer',
      type: 'new_submission',
      title: 'New Publication Uploaded',
      message: `${studentName} has just uploaded "${publicationTitle}" for review.`,
      publicationId: pubId,
      publicationTitle,
      studentName,
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: '/review-publication'
    };

    this._notifications.update(list => [newNotif, ...list]);
    this.saveToStorage();

    this.showToast({
      id: 'toast-' + Date.now(),
      title: 'Reviewer Notified (Pending Review)',
      message: `🔔 New publication "${publicationTitle}" uploaded by ${studentName}. Reviewer dashboard bell updated.`,
      type: 'info',
      timestamp: new Date()
    });

    return newNotif;
  }

  /**
   * Called when a lecturer reviews a publication (accepts or rejects):
   * Adds a notification to the Student's dashboard and increments their bell counter.
   */
  reviewPublication(
    publicationTitle: string,
    decision: 'accepted' | 'rejected',
    reviewerName: string = 'Dr. M. Tau (Senior Lecturer & Reviewer)',
    feedback?: string,
    publicationId?: string
  ): NotificationItem {
    const isAccepted = decision === 'accepted';
    const pubId = publicationId || `PUB-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newNotif: NotificationItem = {
      id: 'stud-notif-' + Date.now(),
      recipientRole: 'student',
      type: isAccepted ? 'review_accepted' : 'review_rejected',
      title: isAccepted ? 'Publication Accepted' : 'Publication Rejected (Revisions Required)',
      message: isAccepted
        ? `Great news! Your publication "${publicationTitle}" has been accepted by ${reviewerName}.`
        : `Your publication "${publicationTitle}" was rejected with feedback by ${reviewerName}.`,
      publicationId: pubId,
      publicationTitle,
      reviewerName,
      feedback: feedback || (isAccepted
        ? 'Paper meets all faculty publication standards and is approved for final archiving.'
        : 'Revisions required: Please address reviewer remarks on methodology and formatting before re-uploading.'),
      timestamp: new Date().toISOString(),
      read: false
    };

    this._notifications.update(list => [newNotif, ...list]);
    this.saveToStorage();

    this.showToast({
      id: 'toast-' + Date.now(),
      title: isAccepted ? 'Student Notified: Accepted' : 'Student Notified: Rejected',
      message: `🔔 Student bell notification sent: "${publicationTitle}" was ${decision} by ${reviewerName}.`,
      type: isAccepted ? 'success' : 'warning',
      timestamp: new Date()
    });

    return newNotif;
  }

  markAsRead(id: string): void {
    this._notifications.update(list =>
      list.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    this.saveToStorage();
  }

  markAllAsRead(role: NotificationRole): void {
    this._notifications.update(list =>
      list.map(n => (n.recipientRole === role ? { ...n, read: true } : n))
    );
    this.saveToStorage();
  }

  deleteNotification(id: string): void {
    this._notifications.update(list => list.filter(n => n.id !== id));
    this.saveToStorage();
  }

  clearAll(role: NotificationRole): void {
    this._notifications.update(list => list.filter(n => n.recipientRole !== role));
    this.saveToStorage();
  }

  resetMockData(): void {
    this.loadDefaultNotifications();
    this.showToast({
      id: 'toast-' + Date.now(),
      title: 'Notifications Reset',
      message: 'Restored realistic pending reviews for reviewers and decision notices for students.',
      type: 'info',
      timestamp: new Date()
    });
  }

  showToast(toast: ToastMessage): void {
    this._toasts.update(list => [toast, ...list.slice(0, 3)]); // Keep max 4 toasts
    setTimeout(() => {
      this.dismissToast(toast.id);
    }, 6000);
  }

  dismissToast(id: string): void {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }
}

