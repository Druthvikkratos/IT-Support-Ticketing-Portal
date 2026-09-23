import {
  Component,
  computed,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth-service';
import { ChatService } from '../../../core/services/chat-service';
import { SocketService } from '../../../core/services/socket-service';
import { ChatMessage } from '../../../core/models/chat-message.model';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { AttachementService } from '../../../core/services/attachement-service';

@Component({
  selector: 'app-ticket-chat',
  imports: [FormsModule, CommonModule],
  templateUrl: './ticket-chat.html',
  styleUrl: './ticket-chat.scss',
})
export class TicketChat {
  @Input({ required: true }) ticketId!: string;
  @Input() ticketClosed = false;
  @Output() closed = new EventEmitter<void>();
  @Input() counterpartName = 'Chat';
  @Input() counterpartUserId?: string;
  @Output() markedRead = new EventEmitter<void>();

  @ViewChild('scrollAnchor') scrollAnchor?: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  socketService = inject(SocketService);
  private chatService = inject(ChatService);
  private attachmentsService = inject(AttachementService);
  authService = inject(AuthService);

  messages = signal<ChatMessage[]>([]);
  loading = signal(true);
  uploadingAttachment = signal(false);
  messageText = '';

  private messageSub?: Subscription;
  private errorSub?: Subscription;
  private shouldScroll = false;
  private typingTimeout?: ReturnType<typeof setTimeout>;

  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);

  typingIndicatorText = computed(() => {
    const myId = this.authService.currentUser()?.id;
    const names = Array.from(this.socketService.typingUsers().entries())
      .filter(([id]) => id !== myId)
      .map(([, name]) => name);
    if (names.length === 0) return null;
    return names.length === 1 ? `${names[0]} is typing...` : `${names.join(', ')} are typing...`;
  });

  ngOnInit() {
    console.log('[Chat] modal opened for ticket', this.ticketId);
    this.loadHistory();
    this.socketService.connect();
    this.socketService.joinRoom(this.ticketId);

    this.chatService.markAsRead(this.ticketId).subscribe({
      next: () => this.markedRead.emit(),
      error: (err: any) => console.error('[Chat] failed to mark as read:', err),
    });

    this.messageSub = this.socketService.messages$.subscribe((msg) => {
      if (!msg || msg.ticketId !== this.ticketId) {
        console.warn('[Chat] received invalid or unrelated message payload:', msg);
        return;
      }
      this.messages.update((current) => [...current, msg]);
      this.shouldScroll = true;
    });
    this.errorSub = this.socketService.error$.subscribe((errMsg) => {
      console.warn('[Chat] error received:', errMsg);
      Swal.fire({ icon: 'error', title: 'Chat error', text: errMsg });
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollAnchor?.nativeElement.scrollIntoView({ behavior: 'smooth' });
      this.shouldScroll = false;
    }
  }

  ngOnDestroy() {
    console.log('[Chat] modal closed for ticket', this.ticketId);
    this.socketService.leaveRoom(this.ticketId);
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.socketService.emitStopTyping(this.ticketId);
    }
    this.clearPreview();
    this.messageSub?.unsubscribe();
    this.errorSub?.unsubscribe();
  }

  private loadHistory() {
    this.loading.set(true);
    this.chatService.getHistory(this.ticketId).subscribe({
      next: (history) => {
        this.messages.set(history);
        this.loading.set(false);
        this.shouldScroll = true;
      },
      error: (err) => {
        console.error('[Chat] failed to load history:', err);
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: 'Could not load chat history' });
      },
    });
  }

  onInputChange() {
    const name = this.authService.currentUser()?.name ?? 'Someone';
    console.log('[Chat] emitting typing');
    this.socketService.emitTyping(this.ticketId, name);
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      console.log('[Chat] emitting stopTyping (timeout)');
      this.socketService.emitStopTyping(this.ticketId);
    }, 2000);
  }

  // send() {
  //   const text = this.messageText.trim();
  //   if (!text) return;
  //   this.socketService.sendMessage(this.ticketId, text);
  //   this.messageText = '';
  //   if (this.typingTimeout) clearTimeout(this.typingTimeout);
  //   this.socketService.emitStopTyping(this.ticketId);
  // }
  send() {
    const text = this.messageText.trim();
    const file = this.selectedFile();
    if (!text && !file) return; // nothing to send
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.socketService.emitStopTyping(this.ticketId);
    if (file) {
      this.uploadingAttachment.set(true);
      this.chatService.uploadAttachment(this.ticketId, file).subscribe({
        next: (attachment) => {
          console.log('[Chat] upload succeeded, real attachment id:', attachment.id);
          this.uploadingAttachment.set(false);
          this.socketService.sendMessage(this.ticketId, text || undefined, attachment.id);
          this.resetComposer();
        },
        error: (err: any) => {
          this.uploadingAttachment.set(false);
          console.error('[Chat] attachment upload failed:', err);
          Swal.fire({
            icon: 'error',
            title: 'Upload failed',
            text: err.error?.message || 'Could not attach this file.',
          });
          // deliberately NOT clearing the composer — let the user retry/remove
        },
      });
    } else {
      this.socketService.sendMessage(this.ticketId, text);
      this.resetComposer();
    }
  }

  private resetComposer() {
    this.messageText = '';
    this.clearPreview();
  }

  onAttachmentSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'File too large',
        text: 'Chat attachments are limited to 10MB.',
      });
      input.value = '';
      return;
    }
    this.clearPreview();
    this.selectedFile.set(file);
    if (file.type.startsWith('image/')) {
      this.previewUrl.set(URL.createObjectURL(file));
    }
    // this.uploadingAttachment.set(true);
    // this.chatService.uploadAttachment(this.ticketId, file).subscribe({
    //   next: (attachment) => {
    //     console.log('[Chat] upload succeeded, real attachment id:', attachment.id);
    //     this.uploadingAttachment.set(false);
    //     this.socketService.sendMessage(this.ticketId, undefined, attachment.id);
    //     input.value = '';
    //   },
    //   error: (err) => {
    //     this.uploadingAttachment.set(false);
    //     console.error('[Chat] attachment upload failed:', err);
    //     Swal.fire({
    //       icon: 'error',
    //       title: 'Upload failed',
    //       text: err.error?.message || 'Could not attach this file.',
    //     });
    //     input.value = '';
    //   },
    // });
  }

  removeAttachment() {
    console.log('[Chat] attachment removed before sending');
    this.clearPreview();
  }

  private clearPreview() {
    const url = this.previewUrl();
    if (url) URL.revokeObjectURL(url); // avoid leaking blob URLs
    this.selectedFile.set(null);
    this.previewUrl.set(null);
  }

  isMine(msg: ChatMessage): boolean {
    return msg.senderId === this.authService.currentUser()?.id;
  }

  isImage(msg: ChatMessage): boolean {
    return !!msg.attachment?.detectedMime?.startsWith('image/');
  }

  viewUrl(msg: any): string {
    return this.attachmentsService.viewUrl(this.ticketId, msg.attachment!.id);
  }
  downloadUrl(msg: any): string {
    return this.attachmentsService.downloadUrl(this.ticketId, msg.attachment!.id);
  }
  close() {
    this.closed.emit();
  }
}
