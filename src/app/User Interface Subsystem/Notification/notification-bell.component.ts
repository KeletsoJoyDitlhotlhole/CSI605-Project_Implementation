import { Component, Input, computed, inject, signal, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { NotificationItem, NotificationRole } from '../../models/notification.model';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss'
})
export class NotificationBellComponent {
  private readonly notificationService = inject(NotificationService);
  private readonly elementRef = inject(ElementRef);
  private readonly router = inject(Router);

  /**
   * The role for this dashboard view:
   * 'reviewer': displays pending reviews uploaded by students
   * 'student': displays review decisions (accepted / rejected) from lecturers
   */
  @Input({ required: true }) role: NotificationRole = 'reviewer';
  @Input() label: string = '';

  readonly isOpen = signal<boolean>(false);
  readonly filter = signal<'all' | 'unread'>('all');

  // Computed notifications based on role
  readonly notifications = computed<NotificationItem[]>(() => {
    return this.role === 'reviewer'
      ? this.notificationService.reviewerNotifications()
      : this.notificationService.studentNotifications();
  });

  // Filtered list
  readonly filteredNotifications = computed<NotificationItem[]>(() => {
    const list = this.notifications();
    if (this.filter() === 'unread') {
      return list.filter(n => !n.read);
    }
    return list;
  });

  // Unread badge count
  readonly unreadCount = computed<number>(() => {
    return this.role === 'reviewer'
      ? this.notificationService.reviewerPendingCount()
      : this.notificationService.studentNotificationCount();
  });

  // Formatted count for badge
  readonly badgeText = computed<string>(() => {
    const count = this.unreadCount();
    if (count > 99) return '99+';
    return count > 0 ? String(count) : '';
  });

  // Dropdown panel title
  readonly panelTitle = computed<string>(() => {
    if (this.label) return this.label;
    return this.role === 'reviewer'
      ? 'Pending Review Notifications'
      : 'Review Decision Notifications';
  });

  readonly panelSubtitle = computed<string>(() => {
    const count = this.unreadCount();
    if (this.role === 'reviewer') {
      return count === 1
        ? '1 pending publication awaiting review'
        : `${count} pending publications awaiting review`;
    } else {
      return count === 1
        ? '1 new review decision received'
        : `${count} review decisions received`;
    }
  });

  toggleOpen(): void {
    this.isOpen.update(v => !v);
  }

  close(): void {
    this.isOpen.set(false);
  }

  setFilter(f: 'all' | 'unread'): void {
    this.filter.set(f);
  }

  markAsRead(item: NotificationItem, event?: Event): void {
    event?.stopPropagation();
    this.notificationService.markAsRead(item.id);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead(this.role);
  }

  clearAll(): void {
    this.notificationService.clearAll(this.role);
  }

  onNotificationClick(item: NotificationItem): void {
    this.notificationService.markAsRead(item.id);
    if (this.role === 'reviewer') {
      this.close();
      this.router.navigate(['/review-publication']);
    }
  }

  // Quick simulation triggers for demonstration
  simulateUpload(): void {
    const samplePapers = [
      'Evaluating Edge AI for Livestock Monitoring in the Central District',
      'Solar-Powered Aquaponics Monitoring Using Microcontrollers',
      'Blockchain Protocol for Student Credential Verification at UB',
      'Sentiment Analysis of Setswana Social Media Posts'
    ];
    const sampleStudents = [
      'Kagiso Mokgosi (StudentID: 202304118)',
      'Tumelo Sithole (StudentID: 202209931)',
      'Naledi Kebonye (StudentID: 202107724)',
      'Baboloki Sebego (StudentID: 202302190)'
    ];

    const randomIdx = Math.floor(Math.random() * samplePapers.length);
    this.notificationService.uploadPublication(
      samplePapers[randomIdx],
      sampleStudents[randomIdx]
    );
  }

  simulateDecision(decision: 'accepted' | 'rejected'): void {
    const samplePapers = [
      'Renewable Microgrids in Rural Ngamiland',
      'Automated Cyber Threat Classification using Naive Bayes Models',
      'Hybrid Cloud Migration in SADC Educational Institutions',
      'Decentralized EHR Security Framework for Gaborone Clinics'
    ];
    const reviewers = [
      'Dr. B. Mothobi (Department of Computer Science)',
      'Prof. K. Modise (Faculty of Engineering & Technology)',
      'Dr. P. Tau (Department of Electrical Engineering)'
    ];

    const paper = samplePapers[Math.floor(Math.random() * samplePapers.length)];
    const reviewer = reviewers[Math.floor(Math.random() * reviewers.length)];

    const feedback = decision === 'accepted'
      ? 'The manuscript was thoroughly examined and fully approved for publication archiving.'
      : 'Manuscript rejected. Please expand the empirical validation and update references.';

    this.notificationService.reviewPublication(
      paper,
      decision,
      reviewer,
      feedback
    );
  }

  formatRelativeTime(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}

