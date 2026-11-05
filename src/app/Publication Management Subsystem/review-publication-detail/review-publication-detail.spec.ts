import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { ReviewPublicationDetail } from './review-publication-detail';

describe('ReviewPublicationDetail', () => {
  let component: ReviewPublicationDetail;
  let fixture: ComponentFixture<ReviewPublicationDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewPublicationDetail],
      providers: [provideRouter([]), provideHttpClient()]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ReviewPublicationDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
