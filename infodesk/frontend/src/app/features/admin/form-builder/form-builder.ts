import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, computed, inject, signal } from '@angular/core';
import { FormFieldFormModal } from './form-field-form-modal/form-field-form-modal';
import { FieldPreview } from './field-preview/field-preview';
import Swal from 'sweetalert2';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FormFieldsService } from '../../../core/services/form-fields-service';
import { FormField } from '../../../core/models/form-field.model';

@Component({
  selector: 'app-form-builder',
  imports: [DragDropModule, FormFieldFormModal, FieldPreview, ReactiveFormsModule, FormsModule],
  templateUrl: './form-builder.html',
  styleUrl: './form-builder.scss',
})
export class FormBuilder {
  private formFieldsService = inject(FormFieldsService)

  fields = signal<FormField[]>([])
  loading = signal(false)

  showModal = signal(false)
  editingField = signal<FormField | null>(null);

  previewFields = computed(() => 
    this.fields()
        .filter((f) => f.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder)
  )

  constructor(){
    this.fetch()
  }

  fetch(){
    this.loading.set(true)
    this.formFieldsService.findAllFormFieldsForAdmin().subscribe({
      next: (field) => {
        this.fields.set(field)
        this.loading.set(false)
      },
      error: () => this.loading.set(false)
    })
  }

  onDrop(event: CdkDragDrop<FormField[]>){
    const redordered = [...this.fields()]
    moveItemInArray(redordered, event.previousIndex, event.currentIndex)
    this.fields.set(redordered)

    const orderedIds = redordered.map((f) => f.id)
    this.formFieldsService.reorderFormFields(orderedIds).subscribe({
      error: () => {
        Swal.fire({ icon: 'error', title: 'Could not save new order', text: 'Reverting to the last saved order.' })
        this.fetch()
      }
    })
  }

  openCreate(){
    this.editingField.set(null)
    this.showModal.set(true)
  }

  openEdit(field: FormField){
    this.editingField.set(field)
    this.showModal.set(true)
  }

  toggleActive(field: FormField){
    const activating = !field.isActive

    Swal.fire({
      title: `${activating ? 'Reactivate' : 'Deactivate'} "${field.label}"?`,
      text: activating
        ? 'This field will reappear on the employee ticket form.'
        : 'Employees will no longer see this field when raising a ticket.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: `Yes, ${activating ? 'reactivate' : 'deactivate'}`,
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.formFieldsService.toggleActiveFormField(field.id).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Updated', timer: 1200, showConfirmButton: false });
          this.fetch();
        },
        error: (err: any) => Swal.fire({ icon: 'error', title: 'Error', text: err.error?.message || 'Something went wrong' }),
      });
    });
  }

  onModalClosed(refresh: boolean){
    this.showModal.set(false)
    if(refresh) this.fetch()
  }

  fieldTypeIcon(type: string): string{
    const icons: Record<string, string> = {
      text: 'ti-forms', textarea: 'ti-align-left', number: 'ti-hash', date: 'ti-calendar',
      dropdown: 'ti-list', radio: 'ti-circle-dot', checkbox: 'ti-checkbox', phone: 'ti-phone',
    };
    return icons[type] ?? 'ti-forms'
  }

  fieldTypeLabel(type: string): string{
    const labels: Record<string, string> = {
      text: 'Short Text', textarea: 'Long Text', number: 'Number', date: 'Date',
      dropdown: 'Dropdown', radio: 'Radio', checkbox: 'Checkbox', phone: 'Phone',
    };
    return labels[type] ?? type;
  }
}
