import { effect, inject, Injectable, signal } from '@angular/core';
import { CreateTicketPayload } from '../models/ticket.model';
import { TicketService } from './ticket-service';
import { AttachementService } from './attachement-service';
import { AuthService } from './auth-service';
import { ConnectivityService } from './connectivity-service';
import { filter, firstValueFrom, lastValueFrom, Subject } from 'rxjs';
import { HttpEventType } from '@angular/common/http';
import { del, get, getMany, keys, set } from 'idb-keyval';

export interface OutboxItem {
  localId: string;
  userId: string;
  payload: CreateTicketPayload;
  files: { fieldId: number; file: File }[];
  createdAt: number;
  serverTicketId?: string;
  uploadFieldsIds: number[];
  lastError?: string;
}

const PREFIX = 'outbox:';

@Injectable({
  providedIn: 'root',
})
export class OutboxService {
  private ticketService = inject(TicketService);
  private attachmentsService = inject(AttachementService);
  private authService = inject(AuthService);
  private connectivity = inject(ConnectivityService);

  pendingCount = signal(0);
  syncing = signal(false);
  private syncedSubject = new Subject<number>();
  synced$ = this.syncedSubject.asObservable();

  constructor() {
    this.connectivity.backOnline$.subscribe(() => this.syncAll());
    effect(() => {
      this.authService.currentUser();
      this.refreshCount();
    });
    setTimeout(() => this.syncAll(), 3000);
  }

  newId(): string {
    return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async enqueue(payload: CreateTicketPayload, files: { fieldId: number; file: File }[]) {
    const user = this.authService.currentUser();
    if (!user) throw new Error('Not logged in');

    const localId = payload.clientRequestId ?? this.newId();
    const item: OutboxItem = {
      localId,
      userId: user.id,
      files,
      createdAt: Date.now(),
      uploadFieldsIds: [],
      payload: { ...payload, clientRequestId: localId },
    };
    await set(PREFIX + localId, item);
    await this.refreshCount();
  }

  async discard(localId: string) {
    await del(PREFIX + localId);
    await this.refreshCount();
  }

  async list(): Promise<OutboxItem[]> {
    const all = (await keys()).filter((k) => String(k).startsWith(PREFIX));
    const items = await getMany<OutboxItem>(all);
     return items
    .filter((item): item is OutboxItem => item !== undefined)
    .sort((a, b) => a.createdAt - b.createdAt);
  }

  private async refreshCount() {
    const me = this.authService.currentUser()?.id;
    this.pendingCount.set((await this.list()).filter((i) => i.userId === me).length);
  }

  async syncAll() {
    const me = this.authService.currentUser();
    if (this.syncing() || !me) return;

    this.syncing.set(true);
    let sent = 0;
    try {
      for (const item of (await this.list()).filter((i) => i.userId === me.id)) {
        try {
          await this.syncOne(item);
          await del(PREFIX + item.localId);
          sent++;
        } catch (error: any) {
          item.lastError = error?.error?.message ?? error?.message ?? 'Unknown error';
          await set(PREFIX + item.localId, item);
          if (error?.status === 0 || error?.status === 401) break;
        }
      }
    } finally {
      this.syncing.set(false);
      await this.refreshCount();
      if (sent > 0) this.syncedSubject.next(sent);
    }
  }

  private async syncOne(item: OutboxItem) {
    if (!item.serverTicketId) {
      const ticket = await firstValueFrom(this.ticketService.create(item.payload));
      item.serverTicketId = ticket.id;
      await set(PREFIX + item.localId, item);
    }

    const byField = new Map<number, File[]>();
    for (const f of item.files) byField.set(f.fieldId, [...(byField.get(f.fieldId) ?? []), f.file]);

    for (const [fieldId, files] of byField) {
      if (item.uploadFieldsIds.includes(fieldId)) continue;
      await lastValueFrom(
        this.attachmentsService
          .upload(item.serverTicketId!, fieldId, files)
          .pipe(filter((e) => e.type === HttpEventType.Response)),
      );
      item.uploadFieldsIds.push(fieldId);
      await set(PREFIX + item.localId, item);
    }
  }
}
