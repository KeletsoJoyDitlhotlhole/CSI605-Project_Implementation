import { Component, Inject, PLATFORM_ID, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-submit-publication',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './submit-publication.component.html',
  styleUrl: './submit-publication.component.scss'
})
export class SubmitPublicationComponent {
  private readonly apiUrl = 'http://localhost:3000/api/publications';
  private readonly userLookupUrl = 'http://localhost:3000/api/users';

  // Form fields
  title = '';
  abstract = '';
  keywords: string[] = [''];
  submittedBy = '';
  publicationType = '';
  studentLevel: 'masters' | 'phd' | '' = '';
  dbAcademicLevelLocked = false;
  isLecturer = false;
  studentNameFromDb = '';

  authors: string[] = [''];
  selectedFile: File | null = null;

  errorMessage = '';
  successMessage = '';
  fieldErrors: Record<string, string> = {};

  isSubmitting = false;

  // Allowed publication types for students (restricted to Thesis / Dissertation)
  readonly publicationTypes = ['Thesis', 'Dissertation'];

  // Subject area list (extensive list)
  readonly subjectAreas: string[] = [
    'Operating Systems',
    'Artificial Intelligence',
    'Machine Learning & Deep Learning',
    'Databases',
    'Data Warehousing & Business Intelligence',
    'Software Engineering',
    'Computer Networks & Communications',
    'Cybersecurity & Cryptography',
    'Cloud Computing & Virtualization',
    'Distributed Systems',
    'Human-Computer Interaction (HCI)',
    'Data Science & Big Data Analytics',
    'Computer Vision & Image Processing',
    'Natural Language Processing (NLP)',
    'Internet of Things (IoT) & Embedded Systems',
    'Algorithms & Data Structures',
    'Information Retrieval & Search Systems',
    'Blockchain & Distributed Ledgers',
    'Robotics & Autonomous Systems',
    'Parallel & High-Performance Computing',
    'Bioinformatics & Computational Biology',
    'Information Systems & Enterprise Architecture',
    'Mobile Application Development',
    'Web Technologies & Web Services',
    'Computer Graphics & Animation',
    'Quantum Computing',
    'Formal Methods & Software Verification',
    'Computer Architecture & Hardware Design',
    'Health Informatics',
    'Theory of Computation'
  ];

  // Quick suggestions chips for popular domain keywords
  readonly popularKeywords: string[] = [
    'Data Science',
    'Operating Systems',
    'Databases',
    'Artificial Intelligence',
    'Machine Learning',
    'Software Engineering',
    'Computer Networks',
    'Cybersecurity',
    'Cloud Computing',
    'Distributed Systems',
    'Big Data Analytics',
    'Internet of Things (IoT)'
  ];

  // Quick suggestions chips for popular areas
  readonly popularSubjects: string[] = [
    'Operating Systems',
    'Artificial Intelligence',
    'Databases',
    'Data Warehousing & Business Intelligence',
    'Software Engineering',
    'Computer Networks & Communications',
    'Cybersecurity & Cryptography'
  ];

  // UI search term for subject areas
  subjectAreaSearch = '';
  // Selected subject area
  selectedSubjectArea = '';

  // Helper getter to filter subject areas (case‑insensitive)
  get filteredSubjectAreas(): string[] {
    const term = (this.subjectAreaSearch || '').trim().toLowerCase();
    if (!term) return this.subjectAreas;
    return this.subjectAreas.filter(sa => sa.toLowerCase().includes(term));
  }

  // Publication type options – students can ONLY submit Thesis or Dissertation
  get filteredPublicationTypes(): { value: string; label: string }[] {
    if (this.isLecturer) {
      return [
        { value: 'Journal Article', label: 'Journal Article' },
        { value: 'Conference Paper', label: 'Conference Paper' }
      ];
    }
    // Students can ONLY submit Thesis or Dissertation
    if (this.studentLevel === 'masters') {
      return [{ value: 'Thesis', label: "Thesis (Master's Students)" }];
    }
    if (this.studentLevel === 'phd') {
      return [{ value: 'Dissertation', label: "Dissertation (PhD Students)" }];
    }
    // If level is not yet selected, provide both Thesis and Dissertation
    return [
      { value: 'Thesis', label: "Thesis (Master's Students)" },
      { value: 'Dissertation', label: "Dissertation (PhD Students)" }
    ];
  }

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly authService: AuthService,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {
    // Reactively sync when AuthService loads/updates the user profile
    effect(() => {
      const u = this.authService.currentUser();
      if (u) {
        if (!this.submittedBy && u.id) {
          this.submittedBy = u.id;
        }
        const roles = (u.roles || []).map((r: string) => r.toLowerCase());
        const idUpper = (u.id || '').toUpperCase();
        const userIsLecturer = idUpper.startsWith('LEC') ||
                               ((roles.includes('lecturer') || roles.includes('reviewer')) && !roles.includes('student'));
        this.applyUserProfileFromDb(u.academic_level, u.name || '', userIsLecturer ? 'lecturer' : (roles.includes('student') ? 'student' : ''));
      }
    });

    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const u = this.authService.currentUser() || JSON.parse(localStorage.getItem('auth_user') || 'null');
      if (u) {
        if (u.id) this.submittedBy = u.id;
        const roles = (u.roles || []).map((r: string) => r.toLowerCase());
        const idUpper = (u.id || '').toUpperCase();
        const userIsLecturer = idUpper.startsWith('LEC') ||
                               ((roles.includes('lecturer') || roles.includes('reviewer')) && !roles.includes('student'));
        this.applyUserProfileFromDb(u.academic_level, u.name || '', userIsLecturer ? 'lecturer' : (roles.includes('student') ? 'student' : ''));
      }
      if (this.submittedBy) {
        this.lookupUserAcademicLevel(this.submittedBy);
      }
    } catch {}
  }

  private applyUserProfileFromDb(rawLevel: string | null | undefined, name = '', rawRole = ''): void {
    const lvl = (rawLevel || '').trim().toLowerCase();
    const role = (rawRole || '').trim().toLowerCase();
    if (name) {
      this.studentNameFromDb = name;
    }
    if (role === 'lecturer' || role === 'reviewer') {
      this.isLecturer = true;
      this.studentLevel = '';
      this.dbAcademicLevelLocked = true;
      if (this.publicationType === 'Thesis' || this.publicationType === 'Dissertation') {
        this.publicationType = '';
      }
      return;
    }
    this.isLecturer = false;
    if (lvl.includes('master')) {
      this.studentLevel = 'masters';
      this.dbAcademicLevelLocked = true;
      this.publicationType = 'Thesis';
    } else if (lvl.includes('phd') || lvl.includes('doc')) {
      this.studentLevel = 'phd';
      this.dbAcademicLevelLocked = true;
      this.publicationType = 'Dissertation';
    } else {
      this.dbAcademicLevelLocked = false;
    }
    // If not a lecturer, prevent any lecturer-only publication types from lingering
    if (!this.isLecturer && (this.publicationType === 'Journal Article' || this.publicationType === 'Conference Paper')) {
      this.publicationType = this.studentLevel === 'masters' ? 'Thesis' : (this.studentLevel === 'phd' ? 'Dissertation' : '');
    }
  }

  onSubmittedByChange(value: string): void {
    this.submittedBy = value;
    delete this.fieldErrors['submittedBy'];
    const trimmed = (value || '').trim();
    if (trimmed.length >= 4) {
      this.lookupUserAcademicLevel(trimmed);
    } else {
      this.dbAcademicLevelLocked = false;
      this.isLecturer = false;
      this.studentNameFromDb = '';
    }
  }

  lookupUserAcademicLevel(identifier: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const cleanId = (identifier || '').trim();
    if (!cleanId) return;
    this.http.get<any>(`${this.userLookupUrl}/${encodeURIComponent(cleanId)}`).subscribe({
      next: profile => {
        if (profile) {
          this.applyUserProfileFromDb(profile.academic_level, profile.name || '', profile.role || '');
        } else {
          this.dbAcademicLevelLocked = false;
          this.isLecturer = false;
          this.studentNameFromDb = '';
        }
      },
      error: () => {
        this.dbAcademicLevelLocked = false;
        this.studentNameFromDb = '';
      }
    });
  }

  onStudentLevelChange(level: 'masters' | 'phd'): void {
    if (this.dbAcademicLevelLocked) return;
    this.studentLevel = level;
    try { localStorage.setItem('student_academic_level', level); } catch {}
    delete this.fieldErrors['studentLevel'];
    // Students submit Thesis for Master's, Dissertation for PhD
    if (level === 'masters') {
      this.publicationType = 'Thesis';
      delete this.fieldErrors['publicationType'];
    } else if (level === 'phd') {
      this.publicationType = 'Dissertation';
      delete this.fieldErrors['publicationType'];
    }
  }

  onPublicationTypeChange(): void {
    if (this.isLecturer) {
      if (this.publicationType === 'Thesis' || this.publicationType === 'Dissertation') {
        this.fieldErrors['publicationType'] = 'Lecturers can only submit Journal Articles or Conference Papers.';
      } else {
        delete this.fieldErrors['publicationType'];
      }
      return;
    }

    if (this.publicationType === 'Journal Article' || this.publicationType === 'Conference Paper') {
      this.fieldErrors['publicationType'] = 'Only lecturers are able to submit Journal Articles and Conference Papers. Students must submit a Thesis or Dissertation.';
      return;
    }

    if (this.publicationType === 'Thesis') {
      if (this.studentLevel === 'phd') {
        this.fieldErrors['publicationType'] = "Theses are reserved for Master's students. PhD students must submit a Dissertation.";
      } else {
        this.studentLevel = 'masters';
        delete this.fieldErrors['publicationType'];
      }
    } else if (this.publicationType === 'Dissertation') {
      if (this.studentLevel === 'masters') {
        this.fieldErrors['publicationType'] = "Dissertations are reserved for PhD students. Master's students must submit a Thesis.";
      } else {
        this.studentLevel = 'phd';
        delete this.fieldErrors['publicationType'];
      }
    } else {
      delete this.fieldErrors['publicationType'];
    }
  }

  selectSubjectArea(area: string): void {
    this.selectedSubjectArea = area;
    delete this.fieldErrors['subjectArea'];
  }

  clearSubjectSearch(): void {
    this.subjectAreaSearch = '';
  }

  trackByIndex(index: number): number { return index; }

  get validKeywordCount(): number {
    return this.keywords.filter(k => k && k.trim().length > 0).length;
  }

  getKeywordPlaceholder(index: number): string {
    const examples = [
      'e.g. Data Science',
      'e.g. Operating Systems',
      'e.g. Databases',
      'e.g. Artificial Intelligence',
      'e.g. Computer Networks',
      'e.g. Cybersecurity',
      'e.g. Software Engineering',
      'e.g. Cloud Computing'
    ];
    return examples[index % examples.length] || 'Enter keyword (e.g. Data Science)';
  }

  addKeyword(initialValue = ''): void {
    this.keywords = [...this.keywords, initialValue];
    delete this.fieldErrors['keywords'];
  }

  removeKeyword(index: number): void {
    if (this.keywords.length > 1) {
      this.keywords = this.keywords.filter((_, i) => i !== index);
    } else {
      this.keywords = [''];
    }
    delete this.fieldErrors['keywords'];
  }

  toggleKeywordSuggestion(kw: string): void {
    const existingIndex = this.keywords.findIndex(k => k.trim().toLowerCase() === kw.toLowerCase());
    if (existingIndex !== -1) {
      if (this.keywords.length > 1) {
        this.keywords = this.keywords.filter((_, i) => i !== existingIndex);
      } else {
        this.keywords[0] = '';
      }
    } else {
      const emptyIndex = this.keywords.findIndex(k => !k.trim());
      if (emptyIndex !== -1) {
        this.keywords[emptyIndex] = kw;
      } else {
        this.keywords = [...this.keywords, kw];
      }
    }
    delete this.fieldErrors['keywords'];
  }

  isKeywordSelected(kw: string): boolean {
    return this.keywords.some(k => k.trim().toLowerCase() === kw.toLowerCase());
  }

  addAuthor(): void { this.authors = [...this.authors, '']; delete this.fieldErrors['authors']; }

  removeAuthor(index: number): void {
    if (this.authors.length > 1) {
      this.authors = this.authors.filter((_, i) => i !== index);
    }
    delete this.fieldErrors['authors'];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = null;
    delete this.fieldErrors['publicationFile'];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') || (file.type !== '' && file.type !== 'application/pdf')) {
      this.fieldErrors['publicationFile'] = 'Please select a valid PDF file.';
      alert('Invalid field: PDF File. Please select a valid PDF file.');
      input.value = '';
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      this.fieldErrors['publicationFile'] = 'The PDF must not exceed 100 MB.';
      alert('Invalid field: PDF File. The file must not exceed 100 MB.');
      input.value = '';
      return;
    }
    this.selectedFile = file;
  }

  // Abstract word‑count helper (max 1000 words)
  get abstractWordCount(): number {
    if (!this.abstract) return 0;
    const words = this.abstract.trim().split(/\s+/).filter(w => w.length > 0);
    return words.length;
  }

  validateForm(): boolean {
    this.fieldErrors = {};
    if (!this.title.trim()) {
      this.fieldErrors['title'] = 'Publication Title is required.';
    }
    if (!this.publicationType) {
      this.fieldErrors['publicationType'] = 'Publication Type is required.';
    } else if (this.isLecturer) {
      if (this.publicationType !== 'Journal Article' && this.publicationType !== 'Conference Paper') {
        this.fieldErrors['publicationType'] = 'Lecturers are only able to submit Journal Articles or Conference Papers.';
      }
    } else {
      if (this.publicationType === 'Journal Article' || this.publicationType === 'Conference Paper') {
        this.fieldErrors['publicationType'] = 'Only lecturers are able to submit Journal Articles and Conference Papers. Students must submit a Thesis or Dissertation.';
      } else if (this.studentLevel === 'masters' && this.publicationType === 'Dissertation') {
        this.fieldErrors['publicationType'] = "Dissertations are reserved for PhD students. Master's students must submit a Thesis.";
      } else if (this.studentLevel === 'phd' && this.publicationType === 'Thesis') {
        this.fieldErrors['publicationType'] = "Theses are reserved for Master's students. PhD students must submit a Dissertation.";
      }
    }

    if (!this.selectedSubjectArea.trim()) {
      this.fieldErrors['subjectArea'] = 'Please select a Subject Area.';
    }

    if (!this.abstract.trim()) {
      this.fieldErrors['abstract'] = 'Abstract is required.';
    } else if (this.abstractWordCount > 1000) {
      this.fieldErrors['abstract'] = `Abstract exceeds the 1,000-word limit (currently ${this.abstractWordCount} words). Please reduce by ${this.abstractWordCount - 1000} words.`;
    }

    const validKeywords = this.keywords.map(k => k?.trim()).filter(Boolean);
    if (validKeywords.length === 0) {
      this.fieldErrors['keywords'] = 'At least one Domain Keyword is required (e.g. Data Science, Operating Systems, Databases).';
    } else if (this.keywords.some(k => !k?.trim())) {
      this.fieldErrors['keywords'] = 'Complete or remove every empty keyword field.';
    }
    if (!this.authors.some(author => author?.trim())) {
      this.fieldErrors['authors'] = 'At least one Author is required.';
    } else if (this.authors.some(author => !author?.trim())) {
      this.fieldErrors['authors'] = 'Complete or remove every empty Author field.';
    }
    if (!this.selectedFile) {
      this.fieldErrors['publicationFile'] = 'PDF File is required.';
    }
    return Object.keys(this.fieldErrors).length === 0;
  }

  showMissingFieldsPopup(): void {
    const fieldLabels: Record<string, string> = {
      title: 'Publication Title',
      studentLevel: 'Academic Program',
      publicationType: 'Publication Type',
      subjectArea: 'Subject Area',
      abstract: 'Abstract',
      keywords: 'Domain Keywords (one per box)',
      authors: 'Author',
      publicationFile: 'PDF File'
    };
    const missingFields = Object.keys(this.fieldErrors).map(key => {
      const label = fieldLabels[key] ?? key;
      return `• ${label}: ${this.fieldErrors[key]}`;
    });
    if (missingFields.length > 0) {
      alert('Please correct the following field(s):\n\n' + missingFields.join('\n'));
    }
  }

  submitPublication(): void {
    if (this.isSubmitting) return;
    this.successMessage = '';
    this.errorMessage = '';
    if (!this.validateForm()) {
      this.errorMessage = 'Please correct the missing or invalid fields below.';
      this.showMissingFieldsPopup();
      return;
    }
    const formData = new FormData();
    formData.append('title', this.title.trim());
    formData.append('abstract', this.abstract.trim());

    // Combine subject area into keywords if not already present
    const validKeywords = this.keywords.map(k => k.trim()).filter(Boolean);
    let combinedKeywords = [...validKeywords];
    if (this.selectedSubjectArea && !combinedKeywords.some(k => k.toLowerCase() === this.selectedSubjectArea.toLowerCase())) {
      combinedKeywords.unshift(this.selectedSubjectArea);
    }
    const finalKeywords = combinedKeywords.join(', ');
    formData.append('keywords', finalKeywords);
    formData.append('subjectArea', this.selectedSubjectArea.trim());
    formData.append('submittedBy', this.submittedBy.trim());
    formData.append('publicationType', this.publicationType);
    formData.append('studentLevel', this.studentLevel);
    formData.append('academicLevel', this.studentLevel === 'masters' ? "Master's" : (this.studentLevel === 'phd' ? 'PhD' : ''));
    formData.append('authors', JSON.stringify(this.authors.map(a => a.trim())));
    if (this.selectedFile) {
      formData.append('publicationFile', this.selectedFile, this.selectedFile.name);
    }
    this.isSubmitting = true;
    this.http.post<any>(this.apiUrl, formData)
      .pipe(finalize(() => { this.isSubmitting = false; }))
      .subscribe({
        next: response => {
          const reference = response.publication?.publicationReference;
          this.successMessage = reference ? `${response.message} Reference: ${reference}` : (response.message || 'Publication submitted successfully.');
          this.errorMessage = '';
          alert('Success!\n\n' + (response.message || 'Publication submitted successfully.') + (reference ? '\nPublication Reference: ' + reference : ''));
          // Reset form
          this.title = '';
          this.abstract = '';
          this.keywords = [''];
          this.selectedSubjectArea = '';
          this.subjectAreaSearch = '';
          this.publicationType = '';
          this.authors = [''];
          this.selectedFile = null;
          this.fieldErrors = {};
        },
        error: err => {
          console.error('Publication submission failed:', err);
          this.errorMessage = err.error?.message || 'Submission failed. Please check your connection and try again.';
          this.successMessage = '';
          alert('Publication Submission Failed\n\n' + this.errorMessage);
        }
      });
  }

  cancel(): void {
    if (!this.isSubmitting) {
      this.router.navigate(['/dashboard']);
    }
  }
}
