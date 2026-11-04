import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { ToastMessage } from '../../models/notification.model';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      @for (toast of notificationService.toasts(); track toast.id) {
        <div class="toast-item" [ngClass]="'toast-' + toast.type">
          <div class="toast-icon">
            @if (toast.type === 'success') {
              ✓
            } @else if (toast.type === 'warning') {
              ⚠️
            } @else {
              🔔
            }
          </div>
          <div class="toast-content">
            <div class="toast-title">{{ toast.title }}</div>
            <div class="toast-message">{{ toast.message }}</div>
          </div>
          <button
            type="button"
            class="toast-close"
            (click)="dismiss(toast.id)"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      max-width: 420px;
      width: calc(100vw - 40px);
    }

    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      background: #ffffff;
      border-radius: 10px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border-left: 4px solid #800020;
      animation: toast-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes toast-slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast-success {
      border-left-color: #16a34a;
    }

    .toast-warning {
      border-left-color: #dc2626;
    }

    .toast-info {
      border-left-color: #800020;
    }

    .toast-icon {
      font-size: 16px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .toast-content {
      flex: 1 1 auto;
      min-width: 0;
    }

    .toast-title {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 2px;
    }

    .toast-message {
      font-size: 12px;
      color: #475569;
      line-height: 1.4;
      word-break: break-word;
    }

    .toast-close {
      border: 0;
      background: transparent;
      color: #94a3b8;
      font-size: 14px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      flex-shrink: 0;

      &:hover {
        color: #1e293b;
      }
    }
  `]
})
export class ToastContainerComponent {
  readonly notificationService = inject(NotificationService);

  dismiss(id: string): void {
    this.notificationService.dismissToast(id);
  }
}

