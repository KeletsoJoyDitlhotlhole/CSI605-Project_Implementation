import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Service } from "@angular/core";
import { Observable } from "rxjs";
import { APIResponse, ReviewResponse, SubmitResponse } from "../models/publication.model";

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
    fetchReviewList(page = 1, limit = 10): Observable<ReviewResponse> {
        const params = new HttpParams().set("page", page).set("limit", limit);
        return this._httpClient.get<ReviewResponse>(`${this._apiUrl}review`);
    }
}