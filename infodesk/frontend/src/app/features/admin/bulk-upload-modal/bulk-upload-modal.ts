import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { UserService } from '../../../core/services/user-service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-bulk-upload-modal',
  imports: [],
  templateUrl: './bulk-upload-modal.html',
  styleUrl: './bulk-upload-modal.scss',
})
export class BulkUploadModal {
  @Output() closed = new EventEmitter<boolean>();

  private usersService = inject(UserService);

  selectedFile = signal<File | null>(null);
  downloadingTemplate = signal(false);
  uploading = signal(false);
  errorMessage = signal<string | null>(null);

  downloadTemplate() {
    this.downloadingTemplate.set(true);
    this.usersService.downloadBulkTemplate().subscribe({
      next: (bolb) => {
        this.downloadingTemplate.set(false);
        this.triggerDownload(bolb, 'InfoDesk-Bulk-Upload-Template.xlsx')
      },
      error: (err) => {
        this.downloadingTemplate.set(false);
        console.error('[BulkUpload] template download failed:', err);
        Swal.fire({ icon: 'error', title: 'Could not download template' });
      },
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.errorMessage.set(null);

    if (!file) return;

    const validations = ['.xlsx', '.xls'];
    if (!validations.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid file',
        text: 'Please upload an Excel (.xlsx or .xls) file.',
      });
      input.value = '';
      return;
    }
    this.selectedFile.set(file);
  }

  upload() {
    const file = this.selectedFile();
    if (!file) return;

    this.uploading.set(true);
    this.errorMessage.set(null);

    this.usersService.bulkUpload(file).subscribe({
      next: (blob) => {
        this.uploading.set(false);
        this.triggerDownload(blob, 'InfoDesk-Bulk-Upload-Results.xlsx');
        Swal.fire({
          icon: 'success',
          title: 'Upload processed',
          text: 'The results file has been downloaded — check the Remark column for each row.',
          confirmButtonColor: '#0ea5e9',
        }).then(() => this.closed.emit(true));
      },
      error: (err) => {
        this.uploading.set(false);
        console.error('[BulkUpload] upload failed:', err);
        this.errorMessage.set(
          err.error?.message ||
            'Could not process this file. Please check the format and try again.',
        );
      },
    });
  }

  private triggerDownload(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  close() {
    this.closed.emit(false);
  }
}
