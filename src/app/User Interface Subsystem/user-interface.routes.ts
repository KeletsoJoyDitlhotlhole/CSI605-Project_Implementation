import { Routes } from '@angular/router';

import { DashboardComponent } from './Dashboard/dashboard.component';
import { SubmitPublicationComponent } from '../Publication Management Subsystem/Submit Publication/submit-publication.component';
import { ReviewPublication } from '../Publication Management Subsystem/review-publication/review-publication';

export const routes: Routes = [

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
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },

  {
    path: "**",
    loadComponent: () => 
      import("../not-found/not-found")
      .then(m => m.NotFound)
  }

];