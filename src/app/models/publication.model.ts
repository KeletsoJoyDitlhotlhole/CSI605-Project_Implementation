export interface Publication {
    title: string;
    abstract: string;
    keywords: string;
    status: string;
    created_at: string;
    submitted_at: string;
    authors: string[];
    file_id: string;
    original_filename: string;
    stored_filename: string;
    submitter_firstname: string;
    submitter_surname: string;
    submitter_email: string;
}

export interface APIResponse {
    total: number;
    publications: Publication[];
}

export interface SubmitResponse {
    msg: string,
    publication_id: string,
    publication_reference: string
}

export interface ReviewPublication {
  publication_id: string;
  publication_reference: string;
  title: string;
  abstract: string;
  keywords: string;
  status: string;
  created_at: string;
  submitted_at: string;
  authors: string[];
  file_id: string;
  original_filename: string;
  stored_filename: string;
  submitter_firstname: string;
  submitter_surname: string;
  submitter_email: string;
}

export interface ReviewResponse {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    publications: ReviewPublication[];
}