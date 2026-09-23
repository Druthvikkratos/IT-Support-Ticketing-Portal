import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '../models/chat-message.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket | null = null;

  connected = signal(false);
  onlineUsers = signal<Set<string>>(new Set());
  typingUsers = signal<Map<string, string>>(new Map());

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
    this.socket.on('presenceSnapshot', (userIds: string[]) => {
      this.onlineUsers.set(new Set(userIds));
    });

    this.socket.on('presenceChanged', ({ userId, online }: { userId: string; online: boolean }) => {
      this.onlineUsers.update((current) => {
        const updated = new Set(current);
        online ? updated.add(userId) : updated.delete(userId);
        return updated;
      });
    });
    this.socket.on('userTyping', ({ userId, name }: { userId: string; name: string }) => {
      this.typingUsers.update((current) => new Map(current).set(userId, name));
    });
    this.socket.on('userStoppedTyping', ({ userId }: { userId: string }) => {
      this.typingUsers.update((current) => {
        const updated = new Map(current);
        updated.delete(userId);
        return updated;
      });
    });
  }

  joinRoom(ticketId: string) {
    this.socket?.emit('joinTicketRoom', ticketId);
  }

  leaveRoom(ticketId: string) {
    this.socket?.emit('leaveTicketRoom', ticketId);
  }

  sendMessage(ticketId: string, message?: string, attachmentId?: string) {
    if (!this.socket?.connected) {
      this.errorSubject.next('Not connected to chat.');
      return;
    }
    console.log('[Socket] sending message with attachmentId:', attachmentId);
    this.socket.emit('sendMessage', { ticketId, message, attachmentId });
  }

  isOnline(userId: string): boolean {
    return this.onlineUsers().has(userId);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
  }

  emitTyping(ticketId: string, name: string) {
    this.socket?.emit('typing', { ticketId, name });
  }

  emitStopTyping(ticketId: string) {
    this.socket?.emit('stopTyping', { ticketId });
  }
}
