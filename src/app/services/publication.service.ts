// /publication.service.ts

import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { APIResponse, CommentBody, PubStatusResponse, ReviewComment, ReviewPublication, ReviewResponse, SubmitResponse } from "../models/publication.model";

@Injectable({
    providedIn: 'root'
})
export class PublicationService {
    private _apiUrl = 'http://localhost:3000/';
    private _httpClient = inject(HttpClient);

    // Get all publications
    fetchAllPublications(): Observable<APIResponse> {
        return this._httpClient.get<APIResponse>(this._apiUrl);
    }

    // Search and filter publications
    searchPublications(options?: {
        search?: string;
        status?: string;
        type?: string;
        author?: string;
        sort?: string;
        page?: number;
        limit?: number;
    }): Observable<APIResponse> {
        let params = new HttpParams();
        if (options) {
            if (options.search && options.search.trim()) params = params.set('search', options.search.trim());
            if (options.status && options.status !== 'all') params = params.set('status', options.status.trim());
            if (options.type && options.type !== 'all') params = params.set('type', options.type.trim());
            if (options.author && options.author.trim()) params = params.set('author', options.author.trim());
            if (options.sort) params = params.set('sort', options.sort);
            if (options.page) params = params.set('page', options.page.toString());
            if (options.limit) params = params.set('limit', options.limit.toString());
        }
        return this._httpClient.get<APIResponse>(this._apiUrl, { params });
    }

    // Get a single publication by ID
    fetchPublicationById(id: string): Observable<ReviewPublication> {
        return this._httpClient.get<ReviewPublication>(`${this._apiUrl}${encodeURIComponent(id)}`);
    }


    // Create/Upload a publication
    submitPublication(formData: FormData): Observable<SubmitResponse> {
        return this._httpClient.post<SubmitResponse>(this._apiUrl, formData);
    }

    // Get publication with pending reviews
    fetchReviewList(page = 1, limit = 10): Observable<ReviewResponse> {
        const params = new HttpParams().set("page", page.toString()).set("limit", limit.toString());
        return this._httpClient.get<ReviewResponse>(`${this._apiUrl}review`, { params });
    }

    // Change publication status
    updatePubStatus(id: string, status: string): Observable<PubStatusResponse> {
        return this._httpClient.patch<PubStatusResponse>(
            `${this._apiUrl}${encodeURIComponent(id)}/status`, 
            {status}
        );
    }

    // get publication file (for review workflow)
    getPubFile(publicationId: string): Observable<Blob> {
        return this._httpClient.get(
            `${this._apiUrl}review/${publicationId}/file`,
            { responseType: 'blob'}
        );
    }

    // get publication file (general view/download)
    getFile(publicationId: string): Observable<Blob> {
        return this._httpClient.get(
            `${this._apiUrl}${encodeURIComponent(publicationId)}/file`,
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
}