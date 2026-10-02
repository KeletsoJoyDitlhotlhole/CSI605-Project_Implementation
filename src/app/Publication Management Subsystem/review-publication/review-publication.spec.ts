import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReviewPublication } from './review-publication';

describe('ReviewPublication', () => {
  let component: ReviewPublication;
  let fixture: ComponentFixture<ReviewPublication>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewPublication]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ReviewPublication);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
