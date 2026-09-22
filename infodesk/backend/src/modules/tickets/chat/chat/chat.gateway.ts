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
  cors: { origin: process.env.FRONTEND_URL?.split(',') ?? [], credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

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
    this.logger.log(
      `Socket disconnected: ${client.id}${user ? ` (user ${user.userId})` : ''}`,
    );
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
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    try {
      const user: SocketUser | undefined = client.data.user;
      if (!user) {
        client.emit('chatError', { message: 'Not authenticated' });
        return;
      }
      await this.chatService.verifyAccess(dto.ticketId, user);

      const saved = await this.chatService.saveMessage(
        dto.ticketId,
        user.userId,
        dto.message,
      );
      const roomName = `ticket:${dto.ticketId}`;
      this.server.to(roomName).emit('newMessage', saved);
      this.logger.log(`Message broadcast to room ${roomName}`);
    } catch (error: any) {
      this.logger.warn(
        `Send message failed for socket ${client.id}: ${error.message}`,
      );
      client.emit('chatError', {
        message: error.message || 'Could not send message',
      });
    }
  }
}
