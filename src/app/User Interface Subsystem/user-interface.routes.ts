import { Routes } from '@angular/router';

import { Login } from './Login/login.component';
import { DashboardComponent } from './Dashboard/dashboard.component';
import { SubmitPublicationComponent } from '../Publication Management Subsystem/Submit Publication/submit-publication.component';
import { ReviewPublication } from '../Publication Management Subsystem/review-publication/review-publication';
import { ReviewPublicationDetail } from '../Publication Management Subsystem/review-publication-detail/review-publication-detail';
import { ViewSearchPublicationComponent } from '../Publication Management Subsystem/view-search-publication/view-search-publication';
import { ManageProfilesComponent } from './Manage Profiles/manage-profiles.component';

import { roleGuard } from '../services/role.guard';

export const routes: Routes = [
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
    component: SubmitPublicationComponent,
    canActivate: [roleGuard(['student', 'lecturer', 'reviewer', 'admin'])]
  },
  {
    path: 'review-publication',
    component: ReviewPublication,
    canActivate: [roleGuard(['lecturer', 'reviewer', 'admin'])]
  },
  {
    path: 'review-publication/:id',
    component: ReviewPublicationDetail,
    canActivate: [roleGuard(['lecturer', 'reviewer', 'admin'])]
  },
  {
    path: 'manage-profiles',
    component: ManageProfilesComponent,
    canActivate: [roleGuard(['admin'])]
  },
  {
    path: 'search-publications',
    component: ViewSearchPublicationComponent
  },
  {
    path: 'publications',
    component: ViewSearchPublicationComponent
  },
  {
    path: 'view-publications',
    component: ViewSearchPublicationComponent
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    loadComponent: () =>
      import('../not-found/not-found')
        .then(m => m.NotFound)
  }
];
