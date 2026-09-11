import { Component, Input } from '@angular/core';
import { FormField } from '../../../../core/models/form-field.model';

@Component({
  selector: 'app-field-preview',
  imports: [],
  templateUrl: './field-preview.html',
  styleUrl: './field-preview.scss',
})
export class FieldPreview {
  @Input() fields: FormField[] = [];

  formatCategories(categories?: string[]): string {
    if (!categories || categories.length === 0) return '';
    const labels: Record<string, string> = {
      image: 'Images',
      pdf: 'PDF',
      excel: 'Excel',
      document: 'Word',
      video: 'Video',
    };
    return categories.map((c) => labels[c] ?? c).join(', ');
  }
}
