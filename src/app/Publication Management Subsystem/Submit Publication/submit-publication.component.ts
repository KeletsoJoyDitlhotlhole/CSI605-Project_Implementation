import { 
  Component, 

  // Wrapper around native DOM element... we can grab the 
  // <input type="file"> element and clear it after
  // successful submission
  ElementRef,

  // get dependency - e.g., component depends on service class
  // so we inject swervices 
  inject, 

  // holds value and automatically tells Ang when the value
  // changes so the UI updates.
  // used for state that changes after HTTP responses 
  // (like submitting or error message)
  signal, 

  // signal based query.
  // grab reference to an element in the HTML template 
  // by its #templateReference name
  viewChild 
} from '@angular/core';

// required to use [(ngModel)]
import { FormsModule } from '@angular/forms';

// links or routes
import { RouterLink } from '@angular/router';

// handles calls to backend
// this is the dependency that gets handled
import { PublicationService } from '../../services/publication.service';

@Component({
  selector: 'app-submit-publication',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './submit-publication.component.html',
  styleUrl: './submit-publication.component.scss'
})

export class SubmitPublicationComponent {
  
  // dependency injection
  private publicService = inject(PublicationService);
  private fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  // file size constant
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024;

  // form fields binded with [(ngModule)]
  title = "";
  abstract = "";
  keywords = "";
  authorInput = "";

  //signals
  authors = signal<string[]>([]);
  file = signal<File | null>(null);
  errorMessage = signal('');
  successMessage = signal('');
  submitting = signal(false);

  // add authors
  addAuthor(): void {
    // takes whatever is written in the auhorfield
    // cleanses it (trimming trailing spance)
    // reads what is type on author because it is binding 
    // by [(ngModel)]="authorInput"
    const name = this.authorInput.trim();

    // check if name is not empty && if authors array doesn't contain name
    // authors array is being handled by a signal thats why the perculiar
    // checking
    if (name && !this.authors().includes(name)) {
      // array spread because a new array is created
      this.authors.update(list => [...list, name]);
    }

    // clears the input field so that the user can enter the next user
    this.authorInput = ""
  }

  // user clicks x to remove author
  // index: author index in the array
  removeAuthor(index: number): void {
    // update() creates new array
    // filter() returns new array containing elements that pass the test
    // _ first param is the item itself named'_' by convention to tell
    // readers that it is intentionally unused
    // i !== index keep every item except the one at the target index
    // removeAuthor(1) remove author at position 1
    this.authors.update(list => list.filter((_, i) => i !== index));
  }

  // user choose pdf on thier device
  // function validates the file and stores it in the signal
  // (change) event first
  onFileSelected(event: Event): void {
    // event.target elements that triggered event
    // files?.[0] file list
    const selected = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.errorMessage.set('');

    if (!selected) {
      this.file.set(null);
      return;
    }

    if (selected.type !== 'application/pdf') {
      this.errorMessage.set('Only PDF files are allowed');
      this.clearFile();
      return;
    }

    if (selected.size > this.MAX_FILE_SIZE) {
      this.errorMessage.set('The file is larger than 100MB');
      this.clearFile();
      return;
    }

    this.file.set(selected);
  }

  // submit the publication
  submit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    // automatic add of user
    // if user typed uauthor but forgot to add them upon submissio
    if (this.authorInput.trim()) this.addAuthor();

    // retrieve file from signal
    const file = this.file();
    // validation
    if (!this.title.trim() || !this.abstract.trim() || !this.keywords.trim() || this.authors().length === 0 || !file) {
      this.errorMessage.set("Please complete all required fields and choose a PDF file");
      return;
    }

    // new form data object
    const formData = new FormData();
    formData.append("title", this.title.trim());
    formData.append("abstract", this.abstract.trim());
    formData.append("keywords", this.keywords.trim());
    // form data can carry strings and files but not arrays
    formData.append("authors", JSON.stringify(this.authors()));
    formData.append("document", file);

    this.submitting.set(false);
    this.publicService.submitPublication(formData)
      .subscribe({
        next: res => {
          this.submitting.set(false);
          this.successMessage.set(`Publication sumitted. Reference: ${res.publication_reference}`);
          this.resetForm();
        },
        error: err => {
          this.submitting.set(false);
          this.errorMessage.set(err.status === 0 ? 'Cannot access the server. Please try again later.' : err.error?.error ?? 'Submission failed. Please try again');
        }
      });
  }

  private clearFile(): void {
    this.file.set(null);
    const input = this.fileInput()?.nativeElement;
    if (input) input.value = '';
  }

  private resetForm(): void {
    this.title = '';
    this.abstract = '';
    this.keywords = '';
    this.authorInput = '';
    this.authors.set([]);
    this.clearFile();
  }
}