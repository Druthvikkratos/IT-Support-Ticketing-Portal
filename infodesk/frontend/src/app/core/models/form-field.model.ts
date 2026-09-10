export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'dropdown' | 'radio' | 'checkbox' | 'phone'


export interface FormField {
    id: number;
    label: string;
    fieldType: FieldType;
    options: string[] | null
    isRequired: boolean;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateFormFieldPayload{
    label: string;
    fieldType: FieldType;
    isRequired: boolean;
    options?: string[]
}