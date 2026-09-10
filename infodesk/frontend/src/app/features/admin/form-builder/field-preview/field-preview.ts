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
}
