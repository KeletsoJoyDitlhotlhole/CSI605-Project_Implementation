import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReviewPublicationDetail } from './review-publication-detail';

describe('ReviewPublicationDetail', () => {
  let component: ReviewPublicationDetail;
  let fixture: ComponentFixture<ReviewPublicationDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewPublicationDetail]
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
