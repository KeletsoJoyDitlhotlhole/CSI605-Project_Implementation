import { Routes } from '@angular/router';

import { Login } from './Login/login.component';
import { DashboardComponent } from './Dashboard/dashboard.component';
import { SubmitPublicationComponent } from '../Publication Management Subsystem/Submit Publication/submit-publication.component';
import { ReviewPublication } from '../Publication Management Subsystem/review-publication/review-publication';
import { ReviewPublicationDetail } from '../Publication Management Subsystem/review-publication-detail/review-publication-detail';
import { Login } from './Login/login.component';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: 'login',
    component: Login
  },

  {
    path: 'dashboard',
    component: DashboardComponent
  },
  {
    path: 'submit-publication',
    component: SubmitPublicationComponent
  },
  {
    path: 'review-publication',
    component: ReviewPublication
  },

  {
    path: "review-publication/:id",
    component: ReviewPublicationDetail
  },

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: "**",
    loadComponent: () => 
      import("../not-found/not-found")
      .then(m => m.NotFound)
  }
];
