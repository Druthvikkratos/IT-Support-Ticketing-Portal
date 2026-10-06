import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';

interface GuideRow {
  id: number;
  name: string;
  botGuide: { title: string; steps: string[]; isActive: boolean } | null;
}

@Component({
  selector: 'app-bot-guides',
  imports: [FormsModule],
  templateUrl: './bot-guides.html',
  styleUrl: './bot-guides.scss',
})
export class BotGuides {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/bot-guides`;

  rows = signal<GuideRow[]>([]);
  selected = signal<GuideRow | null>(null);
  saving = signal(false);

  title = '';
  steps: string[] = [''];
  isActive = true;

  constructor() {
    this.load();
  }

  private load(keepId?: number) {
    this.http.get<GuideRow[]>(this.base).subscribe((rows) => {
      this.rows.set(rows);
      const again = rows.find((r) => r.id === keepId);
      if (again) this.select(again);
    });
  }

  select(row: GuideRow) {
    this.selected.set(row);
    this.title = row.botGuide?.title ?? `${row.name} — quick fixes`;
    this.steps = row.botGuide?.steps.length ? [...row.botGuide.steps] : [''];
    this.isActive = row.botGuide?.isActive ?? true;
  }

  addStep() {
    this.steps.push('');
  }

  removeStep(i: number) {
    this.steps.slice(i, 1);
    if (this.steps.length === 0) this.steps.push('');
  }

  move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= this.steps.length) return;
    [this.steps[i], this.steps[j]] = [this.steps[j], this.steps[i]];
  }

  save() {
    const row = this.selected();
    if (!row) return;
    const cleaned = this.steps.map((s) => s.trim()).filter(Boolean);
    if (!this.title.trim() || cleaned.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Add a title and at least one step' });
      return;
    }
    this.saving.set(true);
    this.http
      .put(`${this.base}/${row.id}`, {
        title: this.title.trim(),
        steps: cleaned,
        isActive: this.isActive,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          Swal.fire({
            icon: 'success',
            title: 'Guide saved',
            timer: 1200,
            showConfirmButton: false,
          });
          this.load(row.id);
        },
        error: (err) => {
          this.saving.set(false);
          const msg = Array.isArray(err.error?.message)
            ? err.error.message.join(', ')
            : err.error?.message;
          Swal.fire({ icon: 'error', title: 'Could not save', text: msg });
        },
      });
  }

  remove() {
    const row = this.selected();
    if (!row) return;
    Swal.fire({
      title: `Delete the guide for ${row.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Delete',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.http.delete(`${this.base}/${row.id}`).subscribe(() => {
        this.selected.set(null);
        this.load();
      });
    });
  }
}
