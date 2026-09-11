import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { CreateFormFieldPayload, FormField } from '../models/form-field.model';

@Injectable({
  providedIn: 'root',
})
export class FormFieldsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/form-fields`;

  findAllFormFieldsForAdmin(): Observable<FormField[]> {
    return this.http.get<FormField[]>(this.base);
  }

  findAllActiveFormFields(): Observable<FormField[]> {
    return this.http.get<FormField[]>(`${this.base}/active`);
  }

  createFormField(payload: CreateFormFieldPayload): Observable<FormField> {
    return this.http.post<FormField>(this.base, payload);
  }

  updateFormField(id: number, payload: CreateFormFieldPayload): Observable<FormField> {
    return this.http.patch<FormField>(`${this.base}/${id}`, payload);
  }

  toggleActiveFormField(id: number): Observable<FormField> {
    return this.http.patch<FormField>(`${this.base}/${id}/toggle-active`, {});
  }

  reorderFormFields(orderedIds: number[]): Observable<FormField[]> {
    return this.http.patch<FormField[]>(`${this.base}/reorder`, { orderedIds });
  }

  deleteFormField(id: number): Observable<void>{
    return this.http.delete<void>(`${this.base}/${id}`)
  }
}
