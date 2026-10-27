// /publication.service.ts

import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Service } from "@angular/core";
import { Observable } from "rxjs";
import { APIResponse, CommentBody, PublicPublication, PubStatusResponse, ReviewComment, ReviewDetail, ReviewResponse, SearchResponse, SubmitResponse } from "../models/publication.model";

@Service()
export class PublicationService {
    private _apiUrl = 'http://localhost:3000/';
    private _httpClient = inject(HttpClient);

    // Get all publications
    fetchAllPublications(): Observable<APIResponse> {
        return this._httpClient.get<APIResponse>(this._apiUrl);
    }

    // Create/Upload a publication
    submitPublication(formData: FormData): Observable<SubmitResponse> {
        return this._httpClient.post<SubmitResponse>(this._apiUrl, formData);
    }

    // Get publication with pending reviews
    fetchReviewList(page = 1, limit = 10, statuses: string[] = ['pending', 'approved']): Observable<ReviewResponse> {
        const params = new HttpParams()
            .set('page', page)
            .set('limit', limit)
            .set('status', statuses.join(','));
        return this._httpClient.get<ReviewResponse>(`${this._apiUrl}review`, { params });
    }

    fetchReviewDetail(id: string): Observable<ReviewDetail> {
        return this._httpClient.get<ReviewDetail>(`${this._apiUrl}review/${encodeURIComponent(id)}`);
    }

    // Change publication status
    updatePubStatus(id: string, status: string, comments?: string): Observable<PubStatusResponse> {
        return this._httpClient.patch<PubStatusResponse>(
            `${this._apiUrl}${encodeURIComponent(id)}/status`,
            { status, comments }
        );
    }

    // get publication file
    getPubFile(publicationId: string): Observable<Blob> {
        return this._httpClient.get(
            `${this._apiUrl}review/${publicationId}/file`,
            { responseType: 'blob'}
        );
    }

    /**
     * Get comments from the API
     */
    getComments(publicationId: string): Observable<ReviewComment[]> {
        return this._httpClient.get<ReviewComment[]>(`${this._apiUrl}review/${publicationId}/comments`)
    }

    /**
     * Create a comment
     */
    addComment(publicationId: string, commentBody: CommentBody) {
        return this._httpClient.post<ReviewComment>(`${this._apiUrl}review/${publicationId}/comments`, commentBody);
    }

    // Featured (latest approved) publications for the landing page
    fetchFeatured(limit = 4): Observable<{ total: number; publications: PublicPublication[] }> {
        const params = new HttpParams().set('limit', limit);
        return this._httpClient.get<{ total: number; publications: PublicPublication[] }>(
            `${this._apiUrl}featured`, { params });
    }

    // Search approved publications
    searchPublications(q: string, page = 1, sort = 'newest'): Observable<SearchResponse> {
        const params = new HttpParams().set('q', q).set('page', page).set('sort', sort);
        return this._httpClient.get<SearchResponse>(`${this._apiUrl}search`, { params });
    }

    // One approved publication
    getPublication(id: string): Observable<PublicPublication> {
        return this._httpClient.get<PublicPublication>(`${this._apiUrl}view/${encodeURIComponent(id)}`);
    }

    // PDF of an approved publication
    getPublicFile(id: string): Observable<Blob> {
        return this._httpClient.get(
            `${this._apiUrl}view/${encodeURIComponent(id)}/file`,
            { responseType: 'blob' }
        );
    }
}