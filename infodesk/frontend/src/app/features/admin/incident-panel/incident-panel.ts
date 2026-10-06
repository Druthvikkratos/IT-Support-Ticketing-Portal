import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../core/services/settings-service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-incident-panel',
  imports: [FormsModule],
  templateUrl: './incident-panel.html',
  styleUrl: './incident-panel.scss',
})
export class IncidentPanel {
  private settingsService = inject(SettingsService);
  saving = signal(false);
  itPhone = '';
  incident = '';

  constructor() {
    this.settingsService.load();
    effect(() => {
      const s = this.settingsService.settings();
      this.itPhone = s.itPhone;
      this.incident = s.incidentMessage;
    });
  }

  save() {
    this.push({ itPhone: this.itPhone, incidentMessage: this.incident }, 'Published');
  }
  clearIncident() {
    this.push(
      {
        incidentMessage: '',
      },
      'Notice cleared',
    );
  }

  private push(dto: { itPhone?: string; incidentMessage?: string }, okTitle: string) {
    this.saving.set(true);
    this.settingsService.update(dto).subscribe({
      next: () => {
        this.saving.set(false);
        Swal.fire({ icon: 'success', title: okTitle, timer: 1200, showConfirmButton: false });
      },
      error: (err) => {
        this.saving.set(false);
        Swal.fire({ icon: 'error', title: 'Could not save', text: err.error?.message });
      },
    });
  }
}
