import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { getUserFromSocket, SocketUser } from '../utils/socket-auth.util';
import { SendMessageDto } from '../dto/send-message.dto';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: true, credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);
  private onlineUsers = new Map<string, number>();

  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const user = getUserFromSocket(client, this.jwtService);
      if (!user) {
        this.logger.warn(
          `Rejected unauthenticated socket connection: ${client.id}`,
        );
        client.emit('chatError', { message: 'Authentication required' });
        client.disconnect();
        return;
      }
      client.data.user = user;
      this.logger.log(
        `Socket connected: ${client.id} (user ${user.userId}, role ${user.role})`,
      );
      client.emit('presenceSnapshot', Array.from(this.onlineUsers.keys()));
      const currentCount = this.onlineUsers.get(user.userId) ?? 0;
      this.onlineUsers.set(user.userId, currentCount + 1);
      if (currentCount === 0) {
        // this user just came online (first tab/connection) — tell everyone
        this.server.emit('presenceChanged', {
          userId: user.userId,
          online: true,
        });
        this.logger.log(`User ${user.userId} is now ONLINE`);
      }
    } catch (error: any) {
      this.logger.error(
        `Unexpected error during connection handshake: ${error.message}`,
        error.stack,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user: SocketUser | undefined = client.data.user;
    if (!user) return;
    this.logger.log(
      `Socket disconnected: ${client.id}${user ? ` (user ${user.userId})` : ''}`,
    );
    const currentCount = this.onlineUsers.get(user.userId) ?? 0;
    const newCount = Math.max(0, currentCount - 1);
    if (newCount === 0) {
      this.onlineUsers.delete(user.userId);
      this.server.emit('presenceChanged', {
        userId: user.userId,
        online: false,
      });
      this.logger.log(`User ${user.userId} is now OFFLINE`);
    } else {
      this.onlineUsers.set(user.userId, newCount);
    }
  }

  @SubscribeMessage('joinTicketRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() ticketId: string,
  ) {
    try {
      const user: SocketUser | undefined = client.data.user;
      if (!user) {
        client.emit('chatError', { message: 'Not authenticated' });
        return;
      }
      await this.chatService.verifyAccess(ticketId, user);
      const roomName = `ticket:${ticketId}`;
      client.join(roomName);
      this.logger.log(
        `Socket ${client.id} (user ${user.userId}) joined room ${roomName}`,
      );
      client.emit('joinedroom', { ticketId });
    } catch (error: any) {
      this.logger.warn(
        `Join room failed for socket ${client.id}: ${error.message}`,
      );
      client.emit('chatError', {
        message: error.message || 'Could not join this ticket chat',
      });
    }
  }

  @SubscribeMessage('leaveTicketRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() ticketId: string,
  ) {
    const roomName = `ticket:${ticketId}`;
    client.leave(roomName);
    this.logger.log(`Socket ${client.id} left room ${roomName}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const user: SocketUser | undefined = client.data.user
    if(!user){
      client.emit('chatError', {message: 'Not authenticated'})
      return 
    }
    let saved
    try {
      await this.chatService.verifyAccess(dto.ticketId, user);
      saved = await this.chatService.saveMessage(
        dto.ticketId,
        user.userId,
        dto.message,
        dto.attachmentId,
      );
      this.logger.log(`Message broadcast to room ticket:${dto.ticketId}`);
    } catch (error: any) {
      this.logger.warn(
        `Send message failed for socket ${client.id}: ${error.message}`,
      );
      client.emit('chatError', {
        message: error.message || 'Could not send message',
      });
    }
    this.server.to(`ticket:${dto.ticketId}`).emit('newMessage', saved)
    this.logger.log(`Message broadcast to room ticket:${dto.ticketId}`);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() ticketId: string,
  ) {
    const user: SocketUser | undefined = client.data.user;
    if (!user) return;

    // broadcast to everyone else in the room EXCEPT the sender —
    // client.to() (not server.to()) excludes the emitting socket automatically
    client
      .to(`ticket:${ticketId}`)
      .emit('userTyping', { userId: user.userId, name: user.email });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() ticketId: string,
  ) {
    const user: SocketUser | undefined = client.data.user;
    if (!user) return;
    client
      .to(`ticket:${ticketId}`)
      .emit('userStoppedTyping', { userId: user.userId });
  }
}
