import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '../models/chat-message.model';
import { environment } from '../../../environments/environment';

interface UserPresence {
  online: boolean;
  lastSeen: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket | null = null;

  connected = signal(false);
  onlineUsers = signal<Set<string>>(new Set());
  typingUsers = signal<Map<string, string>>(new Map());
  lastSeenUsers = signal<Map<string, Date>>(new Map());

  private messageSubject = new Subject<ChatMessage>();
  messages$ = this.messageSubject.asObservable();

  private errorSubject = new Subject<string>();
  error$ = this.errorSubject.asObservable();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(`${environment.wsUrl}/chat`, { withCredentials: true });

    this.socket.on('connect', () => {
      console.log('[Socket] connected:', this.socket?.id);
      this.connected.set(true);
    });
    this.socket.on('disconnect', () => {
      console.log('[Socket] disconnected');
      this.connected.set(false);
    });
    this.socket.on('connect_error', (err) => {
      console.error('[Socket] connection error:', err.message);
      this.errorSubject.next('Could not connect to chat. Retrying...');
    });
    this.socket.on('newMessage', (message: ChatMessage) => {
      console.log('[Socket] newMessage recieved:', message);
      if (!message) {
        console.error('[Socket] newMessage event fired with a null/undefined payload — ignoring');
        return;
      }
      this.messageSubject.next(message);
    });
    this.socket.on('chatError', (err: { message: string }) => {
      console.warn('[Socket] server error:', err.message);
      this.errorSubject.next(err.message);
    });
    // this.socket.on('presenceSnapshot', (userIds: string[]) => {
    //   this.onlineUsers.set(new Set(userIds));
    // });
    this.socket.on(
      'presenceSnapshot',
      (data: { onlineUserIds: string[]; lastSeenMap: Record<string, string> }) => {
        this.onlineUsers.set(new Set(data.onlineUserIds));
        const map = new Map<string, Date>();
        for (const [userId, isoString] of Object.entries(data.lastSeenMap)) {
          map.set(userId, new Date(isoString));
        }
        this.lastSeenUsers.set(map);
      },
    );

    this.socket.on(
      'presenceChanged',
      ({ userId, online, lastSeen }: { userId: string; online: boolean; lastSeen?: string }) => {
        this.onlineUsers.update((current) => {
          const updated = new Set(current);
          online ? updated.add(userId) : updated.delete(userId);
          return updated;
        });
        this.lastSeenUsers.update((map) => {
          const updated = new Map(map);
          if (online) {
            updated.delete(userId);
          } else if (lastSeen) {
            updated.set(userId, new Date(lastSeen));
          }
          return updated;
        });
      },
    );
    this.socket.on('userTyping', ({ userId, name }: { userId: string; name: string }) => {
      console.log('[Socket] userTyping received:', userId, name);
      this.typingUsers.update((current) => new Map(current).set(userId, name));
    });
    this.socket.on('userStoppedTyping', ({ userId }: { userId: string }) => {
      console.log('[Socket] userStoppedTyping received:', userId);
      this.typingUsers.update((current) => {
        const updated = new Map(current);
        updated.delete(userId);
        return updated;
      });
    });
  }

  joinRoom(ticketId: string) {
    this.typingUsers.set(new Map());
    this.socket?.emit('joinTicketRoom', ticketId);
  }

  leaveRoom(ticketId: string) {
    this.socket?.emit('leaveTicketRoom', ticketId);
    this.typingUsers.set(new Map());
  }

  sendMessage(ticketId: string, message?: string, attachmentId?: string) {
    if (!this.socket?.connected) {
      this.errorSubject.next('Not connected to chat.');
      return;
    }
    console.log('[Socket] sending message with attachmentId:', attachmentId);
    this.socket.emit('sendMessage', { ticketId, message, attachmentId });
  }

  emitTyping(ticketId: string, name: string) {
    console.log('[Socket] emitting typing', ticketId, name);
    this.socket?.emit('typing', { ticketId, name });
  }

  emitStopTyping(ticketId: string) {
    console.log('[Socket] emitting stopTyping', ticketId);
    this.socket?.emit('stopTyping', { ticketId });
  }

  setInitialLastSeen(userId: string, lastSeenIso?: string | Date | null){
    if (!lastSeenIso) return;
    
    this.lastSeenUsers.update((map) => {
      const updated = new Map(map);
      updated.set(userId, new Date(lastSeenIso));
      return updated;
    });
  }

  isOnline(userId: string): boolean {
    if (!userId) return false;
    return this.onlineUsers().has(userId);
  }

  getLastSeen(userId?: string): Date | null {
    if(!userId) return null
    return this.lastSeenUsers().get(userId) ?? null;
  } 

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
  }
}
