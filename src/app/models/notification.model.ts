export type NotificationRole = 'reviewer' | 'student';

export type NotificationType =
  | 'new_submission'
  | 'review_accepted'
  | 'review_rejected';

export interface NotificationItem {
  id: string;
  recipientRole: NotificationRole;
  type: NotificationType;
  title: string;
  message: string;
  publicationId?: string;
  publicationTitle: string;
  studentName?: string;
  reviewerName?: string;
  feedback?: string;
  timestamp: string; // ISO date string
  read: boolean;
  actionUrl?: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

