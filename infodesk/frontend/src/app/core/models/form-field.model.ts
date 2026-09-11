export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'phone'
  | 'email'
  | 'file';

export interface FileConfig {
  allowedCategories: string[];
  allowMultiple: boolean;
  maxSizeMB: number;
}

export interface FormField {
  id: number;
  label: string;
  fieldType: FieldType;
  options: string[] | null;
  fileConfig: FileConfig | null;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFormFieldPayload {
  label: string;
  fieldType: FieldType;
  isRequired: boolean;
  options?: string[];
}

export const FILE_CATEGORY_OPTIONS = [
  { value: 'image', label: 'Images (JPG, PNG, GIF, WEBP)' },
  { value: 'pdf', label: 'PDF Documents' },
  { value: 'excel', label: 'Excel Spreadsheets' },
  { value: 'document', label: 'Word Documents' },
  { value: 'video', label: 'Videos' },
];
