export interface Publication {
    publication_id: string;
    publication_reference: string;
    title: string;
    abstract: string;
    keywords: string;
    status: string;
    publication_type?: string;
    academic_level?: string;
    created_at: string;
    submitted_at: string;
    authors: string[];
    file_id?: string;
    original_filename?: string;
    stored_filename?: string;
    submitter_firstname?: string;
    submitter_surname?: string;
    submitter_email?: string;
    submitter_academic_level?: string;
    // Assigned reviewer (lecturer)
    lecturer_id?: string;
    lecturer_firstname?: string;
    lecturer_surname?: string;
    lecturer_email?: string;
}

export interface APIResponse {
    total: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    publications: Publication[];
}

export interface SubmitResponse {
    msg: string;
    publication_id: string;
    publication_reference: string;
}

export interface ReviewPublication {
  publication_id: string;
  publication_reference: string;
  title: string;
  abstract: string;
  keywords: string;
  status: string;
  publication_type?: string;
  academic_level?: string;
  created_at: string;
  submitted_at: string;
  authors: string[];
  file_id: string;
  original_filename: string;
  stored_filename: string;
  submitter_firstname: string;
  submitter_surname: string;
  submitter_email: string;
  submitter_academic_level?: string;
  // Assigned reviewer (lecturer)
  lecturer_id?: string;
  lecturer_firstname?: string;
  lecturer_surname?: string;
  lecturer_email?: string;
}

export interface ReviewResponse {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    publications: ReviewPublication[];
}

export type PubStatus = "Approved" | "Rejected" | "approved" | "rejected";
export interface PubStatusResponse {
    publication_id: string;
    status: string;
    updated_at: string;
}

export interface ReviewComment {
    id: number;
    title: string;
    details: string;
    createdAt: string;
    reviewerId?: string;
}
export interface CommentBody {
    title: string;
    details: string;
}
