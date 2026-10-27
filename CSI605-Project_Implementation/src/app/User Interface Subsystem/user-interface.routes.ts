import { Routes } from '@angular/router';

import { Login } from './Login/login.component';
import { DashboardComponent } from './Dashboard/dashboard.component';
import { SubmitPublicationComponent } from '../Publication Management Subsystem/Submit Publication/submit-publication.component';
import { ReviewPublication } from '../Publication Management Subsystem/review-publication/review-publication';
import { ReviewPublicationDetail } from '../Publication Management Subsystem/review-publication-detail/review-publication-detail';
import { Publications } from '../Publication Management Subsystem/publications/publications';
import { PublicationView } from '../Publication Management Subsystem/publication-view/publication-view';
import { SearchPublications } from '../Publication Management Subsystem/search-publications/search-publications';


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
    path: 'publications',
    component: Publications
  },
  {
    path: 'publications/:id',
    component: PublicationView
  },
  {
    path: 'search-publications',
    component: SearchPublications
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
