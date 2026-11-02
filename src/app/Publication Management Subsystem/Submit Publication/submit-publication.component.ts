import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-submit-publication',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './submit-publication.component.html',
  styleUrl: './submit-publication.component.scss'
})
export class SubmitPublicationComponent {
  private readonly apiUrl =
    'http://localhost:3000/api/publications';

  title = '';
  abstract = '';
  keywords = '';
  submittedBy = '';
  publicationType = '';
  studentLevel: 'masters' | 'phd' | '' = '';

  authors: string[] = [''];
  selectedFile: File | null = null;

  errorMessage = '';
  successMessage = '';
  fieldErrors: Record<string, string> = {};

  isSubmitting = false;

  readonly publicationTypes = [
    'Journal Article',
    'Conference Paper',
    'Thesis',
    'Dissertation'
  ];

  get filteredPublicationTypes(): { value: string; label: string }[] {
    if (this.studentLevel === 'masters') {
      return [
        { value: 'Journal Article', label: 'Journal Article' },
        { value: 'Conference Paper', label: 'Conference Paper' },
        { value: 'Thesis', label: "Thesis (Master's Students)" }
      ];
    }

    if (this.studentLevel === 'phd') {
      return [
        { value: 'Journal Article', label: 'Journal Article' },
        { value: 'Conference Paper', label: 'Conference Paper' },
        { value: 'Dissertation', label: 'Dissertation (PhD Students)' }
      ];
    }

    return [
      { value: 'Journal Article', label: 'Journal Article' },
      { value: 'Conference Paper', label: 'Conference Paper' },
      { value: 'Thesis', label: "Thesis (Master's Students)" },
      { value: 'Dissertation', label: 'Dissertation (PhD Students)' }
    ];
  }

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {
    try {
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.id) this.submittedBy = u.id;
        if (u.academic_level) {
          const lvl = u.academic_level.toLowerCase();
          if (lvl.includes('master')) this.studentLevel = 'masters';
          else if (lvl.includes('phd')) this.studentLevel = 'phd';
        } else if (Array.isArray(u.roles)) {
          if (u.roles.some((r: string) => r.toLowerCase().includes('phd'))) {
            this.studentLevel = 'phd';
          } else if (u.roles.some((r: string) => r.toLowerCase().includes('master'))) {
            this.studentLevel = 'masters';
          }
        }
      }

      const savedLevel = localStorage.getItem('student_academic_level');
      if (!this.studentLevel && (savedLevel === 'masters' || savedLevel === 'phd')) {
        this.studentLevel = savedLevel;
      }
    } catch {}
  }

  onStudentLevelChange(level: 'masters' | 'phd'): void {
    this.studentLevel = level;
    try {
      localStorage.setItem('student_academic_level', level);
    } catch {}

    delete this.fieldErrors['studentLevel'];

    // Enforce rule: Thesis for Master's, Dissertation for PhD
    if (level === 'masters' && this.publicationType === 'Dissertation') {
      this.publicationType = 'Thesis';
      delete this.fieldErrors['publicationType'];
    } else if (level === 'phd' && this.publicationType === 'Thesis') {
      this.publicationType = 'Dissertation';
      delete this.fieldErrors['publicationType'];
    }
  }

  onPublicationTypeChange(): void {
    if (this.publicationType === 'Thesis') {
      if (this.studentLevel === 'phd') {
        this.fieldErrors['publicationType'] =
          'Theses are reserved for Master\'s students. PhD students must submit a Dissertation.';
      } else {
        this.studentLevel = 'masters';
        try { localStorage.setItem('student_academic_level', 'masters'); } catch {}
        delete this.fieldErrors['publicationType'];
      }
    } else if (this.publicationType === 'Dissertation') {
      if (this.studentLevel === 'masters') {
        this.fieldErrors['publicationType'] =
          'Dissertations are reserved for PhD students. Master\'s students must submit a Thesis.';
      } else {
        this.studentLevel = 'phd';
        try { localStorage.setItem('student_academic_level', 'phd'); } catch {}
        delete this.fieldErrors['publicationType'];
      }
    } else {
      delete this.fieldErrors['publicationType'];
    }
  }


  trackByIndex(index: number): number {
    return index;
  }

  addAuthor(): void {
    this.authors = [...this.authors, ''];
    delete this.fieldErrors['authors'];
  }

  removeAuthor(index: number): void {
    if (this.authors.length > 1) {
      this.authors = this.authors.filter(
        (_, currentIndex) => currentIndex !== index
      );
    }

    delete this.fieldErrors['authors'];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.selectedFile = null;
    delete this.fieldErrors['publicationFile'];

    if (!file) {
      return;
    }

    if (
      !file.name.toLowerCase().endsWith('.pdf') ||
      (file.type !== '' && file.type !== 'application/pdf')
    ) {
      this.fieldErrors['publicationFile'] =
        'Please select a valid PDF file.';

      alert(
        'Invalid field: PDF File. Please select a valid PDF file.'
      );

      input.value = '';
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      this.fieldErrors['publicationFile'] =
        'The PDF must not exceed 100 MB.';

      alert(
        'Invalid field: PDF File. The file must not exceed 100 MB.'
      );

      input.value = '';
      return;
    }

    this.selectedFile = file;
  }

  validateForm(): boolean {
    this.fieldErrors = {};

    if (!this.title.trim()) {
      this.fieldErrors['title'] =
        'Publication Title is required.';
    }

    if (!this.publicationType) {
      this.fieldErrors['publicationType'] =
        'Publication Type is required.';
    } else if (this.studentLevel === 'masters' && this.publicationType === 'Dissertation') {
      this.fieldErrors['publicationType'] =
        'Dissertations are reserved for PhD students. Master\'s students must submit a Thesis.';
    } else if (this.studentLevel === 'phd' && this.publicationType === 'Thesis') {
      this.fieldErrors['publicationType'] =
        'Theses are reserved for Master\'s students. PhD students must submit a Dissertation.';
    }

    if (!this.abstract.trim()) {
      this.fieldErrors['abstract'] =
        'Abstract is required.';
    }

    if (!this.keywords.trim()) {
      this.fieldErrors['keywords'] =
        'Domain Keywords are required.';
    }

    if (!this.authors.some(author => author.trim())) {
      this.fieldErrors['authors'] =
        'At least one Author is required.';
    } else if (this.authors.some(author => !author.trim())) {
      this.fieldErrors['authors'] =
        'Complete or remove every empty Author field.';
    }

    if (!this.selectedFile) {
      this.fieldErrors['publicationFile'] =
        'PDF File is required.';
    }

    if (!this.submittedBy.trim()) {
      this.fieldErrors['submittedBy'] =
        'Student ID is required.';
    }

    return Object.keys(this.fieldErrors).length === 0;
  }

  showMissingFieldsPopup(): void {
    const fieldLabels: Record<string, string> = {
      title: 'Publication Title',
      studentLevel: 'Academic Program',
      publicationType: 'Publication Type',
      abstract: 'Abstract',
      keywords: 'Domain Keywords',
      authors: 'Author',
      publicationFile: 'PDF File',
      submittedBy: 'Student ID'
    };

    const missingFields = Object.keys(this.fieldErrors).map(key => {
      const label = fieldLabels[key] ?? key;
      return `• ${label}: ${this.fieldErrors[key]}`;
    });

    if (missingFields.length > 0) {
      alert(
        'Please correct the following field(s):\n\n' +
        missingFields.join('\n')
      );
    }
  }

  submitPublication(): void {
    if (this.isSubmitting) {
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';

    if (!this.validateForm()) {
      this.errorMessage =
        'Please correct the missing fields below.';

      this.showMissingFieldsPopup();
      return;
    }

    const formData = new FormData();

    formData.append('title', this.title.trim());
    formData.append('abstract', this.abstract.trim());
    formData.append('keywords', this.keywords.trim());
    formData.append('submittedBy', this.submittedBy.trim());
    formData.append('publicationType', this.publicationType);
    formData.append('studentLevel', this.studentLevel);
    formData.append('academicLevel', this.studentLevel === 'masters' ? "Master's" : (this.studentLevel === 'phd' ? 'PhD' : ''));

    formData.append(
      'authors',
      JSON.stringify(
        this.authors.map(author => author.trim())
      )
    );

    if (this.selectedFile) {
      formData.append(
        'publicationFile',
        this.selectedFile,
        this.selectedFile.name
      );
    }

    this.isSubmitting = true;

    this.http.post<any>(this.apiUrl, formData)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: response => {
          const reference =
            response.publication?.publicationReference;

          this.successMessage = reference
            ? `${response.message} Reference: ${reference}`
            : response.message || 'Publication submitted successfully.';

          this.errorMessage = '';

          alert(
            'Success!\n\n' +
            (response.message || 'Publication submitted successfully.') +
            (reference
              ? '\nPublication Reference: ' + reference
              : '')
          );
        },

        error: error => {
          console.error(
            'Publication submission failed:',
            error
          );

          this.errorMessage =
            error.error?.message ||
            'Submission failed. Please check your connection and try again.';

          this.successMessage = '';

          alert(
            'Publication Submission Failed\n\n' +
            this.errorMessage
          );
        }
      });
  }

  cancel(): void {
    if (!this.isSubmitting) {
      this.router.navigate(['/dashboard']);
    }
  }
}
