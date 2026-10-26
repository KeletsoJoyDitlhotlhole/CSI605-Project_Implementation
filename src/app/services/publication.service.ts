// /publication.service.ts

import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Service } from "@angular/core";
import { Observable } from "rxjs";
import { APIResponse, CommentBody, PubStatusResponse, ReviewComment, ReviewResponse, SubmitResponse } from "../models/publication.model";

@Service()
export class PublicationService {
    private _apiUrl = 'http://localhost:3000/';
    private _httpClient = inject(HttpClient);

    /**
     * Fetch all publications
     * 
     * Retrievel all the publication that are approved.
     * 
     * @returns Publications object.
     */
    fetchAllPublications(): Observable<APIResponse> {
        return this._httpClient.get<APIResponse>(this._apiUrl);
    }

    /**
     * Upload publication.
     * 
     * @param formData 
     * @returns Obervable
     */
    submitPublication(formData: FormData): Observable<SubmitResponse> {
        return this._httpClient.post<SubmitResponse>(this._apiUrl, formData);
    }

    // Get publication with pending reviews
    /**
     * Fetch all publications that have to be reviewd.
     * 
     * @param page 
     * @param limit 
     * @returns 
     */
    fetchReviewList(page = 1, limit = 10): Observable<ReviewResponse> {
        const params = new HttpParams().set("page", page).set("limit", limit);
        return this._httpClient.get<ReviewResponse>(`${this._apiUrl}review`);
    }

    /**
     * Change publication status during the review process.
     * 
     * @param id 
     * @param status 
     * @returns 
     */
    updatePubStatus(id: string, status: string): Observable<PubStatusResponse> {
        return this._httpClient.patch<PubStatusResponse>(
            `${this._apiUrl}${encodeURIComponent(id)}/status`, 
            {status}
        );
    }

    /**
     * Get publication PDF file.
     * 
     * @param publicationId 
     * @returns 
     */
    getPubFile(publicationId: string): Observable<Blob> {
        return this._httpClient.get(
            `${this._apiUrl}review/${publicationId}/file`,
            { responseType: 'blob'}
        );
    }

    /**
     * Get comments for a publication during the review process.
     * 
     * @param publicationId 
     * @returns 
     */
    getComments(publicationId: string): Observable<ReviewComment[]> {
        return this._httpClient.get<ReviewComment[]>(`${this._apiUrl}review/${publicationId}/comments`)
    }

    /**
     * Add a comment for publication beng reviewed.
     * 
     * @param publicationId 
     * @param commentBody 
     * @returns 
     */
    addComment(publicationId: string, commentBody: CommentBody) {
        return this._httpClient.post<ReviewComment>(`${this._apiUrl}review/${publicationId}/comments`, commentBody);
    }

    /**
     * Get an approved publication from the data store.
     * 
     * @param id Publication unique identity key 
     * @returns Publication
     */
    getPublication(id: string): Observable<any> {
        return this._httpClient.get<any>(`${this._apiUrl}publication/${encodeURIComponent(id)}`);
    }

    /**
     * Search for a publication in the respository using token.
     * 
     * @param query 
     * @param page 
     * @param sort 
     * @returns 
     */
    searchPublications(query: string, page = 1, sort: string = "newest"): Observable<ReviewResponse> {
        const params = new HttpParams().set("q", query).set("page", page).set("sort", sort);
        return this._httpClient.get<ReviewResponse>(`${this._apiUrl}search`, { params });
    }
}