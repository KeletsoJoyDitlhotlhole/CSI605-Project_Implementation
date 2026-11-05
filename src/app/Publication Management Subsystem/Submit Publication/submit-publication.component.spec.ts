import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { SubmitPublicationComponent } from './submit-publication.component';

describe('SubmitPublicationComponent', () => {
  let component: SubmitPublicationComponent;
  let fixture: ComponentFixture<SubmitPublicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmitPublicationComponent],
      providers: [provideRouter([]), provideHttpClient()]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SubmitPublicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

