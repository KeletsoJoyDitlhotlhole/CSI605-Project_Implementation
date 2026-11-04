import { Routes } from '@angular/router';
import { DashboardComponent } from './Dashboard/dashboard.component';
import { StudentDashboardComponent } from './Dashboard/student-dashboard.component';

export const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent
  },
  {
    path: 'lecturer-dashboard',
    component: DashboardComponent
  },
  {
    path: 'student-dashboard',
    component: StudentDashboardComponent
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  }
];
