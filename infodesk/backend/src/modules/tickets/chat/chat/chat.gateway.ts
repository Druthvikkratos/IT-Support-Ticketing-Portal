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
import { NotificationService } from 'src/modules/notifications/notifications/notification.service';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: true, credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);
  private onlineUsers = new Map<string, number>();
  private lastSeenUsers = new Map<string, Date>();

  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private notificationService: NotificationService,
    private prisma: PrismaService,
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
      const lastSeenObj = Object.fromEntries(
        Array.from(this.lastSeenUsers.entries()).map(([id, date]) => [
          id,
          date.toISOString(),
        ]),
      );
      this.logger.log(
        `Socket connected: ${client.id} (user ${user.userId}, role ${user.role})`,
      );
      // client.emit('presenceSnapshot', Array.from(this.onlineUsers.keys()));
      client.emit('presenceSnapshot', {
        onlineUserIds: Array.from(this.onlineUsers.keys()),
        lastSeenMap: lastSeenObj,
      });
      const currentCount = this.onlineUsers.get(user.userId) ?? 0;
      this.onlineUsers.set(user.userId, currentCount + 1);
      if (currentCount === 0) {
        this.lastSeenUsers.delete(user.userId);
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

  async handleDisconnect(client: Socket) {
    const user: SocketUser | undefined = client.data.user;
    if (!user) return;
    this.logger.log(
      `Socket disconnected: ${client.id}${user ? ` (user ${user.userId})` : ''}`,
    );
    const currentCount = this.onlineUsers.get(user.userId) ?? 0;
    const newCount = Math.max(0, currentCount - 1);
    if (newCount === 0) {
      this.onlineUsers.delete(user.userId);
      const now = new Date();
      this.lastSeenUsers.set(user.userId, now);
      this.server.emit('presenceChanged', {
        userId: user.userId,
        online: false,
        lastSeen: now.toISOString(),
      });
      try {
        await this.prisma.user.update({
          where: { id: user.userId },
          data: { lastSeen: now },
        });
        this.logger.log(`User ${user.userId} is OFFLINE. DB updated.`);
      } catch (error) {
        this.logger.error(
          `Failed to update lastSeen for user ${user.userId}`,
          error,
        );
      }
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
    const user: SocketUser | undefined = client.data.user;
    const roomName = `ticket:${ticketId}`;
    client.leave(roomName);
    this.logger.log(`Socket ${client.id} left room ${roomName}`);
    if (user) {
      client.to(roomName).emit('userStoppedTyping', { userId: user.userId });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const user: SocketUser | undefined = client.data.user;
    if (!user) {
      client.emit('chatError', { message: 'Not authenticated' });
      return;
    }
    let saved;
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
    this.server.to(`ticket:${dto.ticketId}`).emit('newMessage', saved);
    this.logger.log(`Message broadcast to room ticket:${dto.ticketId}`);
    this.dispatchMessageNotification(dto.ticketId, user).catch((err) =>
      this.logger.error(
        `Notification dispatch failed for message on ticket ${dto.ticketId}: ${err.message}`,
      ),
    );
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string; name: string },
  ) {
    const user: SocketUser | undefined = client.data.user;
    this.logger.log(
      `[TYPING] received from socket ${client.id}, user=${user?.userId}, ticket=${data?.ticketId}, name=${data?.name}`,
    );
    if (!user) return;

    // broadcast to everyone else in the room EXCEPT the sender —
    // client.to() (not server.to()) excludes the emitting socket automatically
    client
      .to(`ticket:${data.ticketId}`)
      .emit('userTyping', { userId: user.userId, name: data.name });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    const user: SocketUser | undefined = client.data.user;
    if (!user) return;
    client
      .to(`ticket:${data.ticketId}`)
      .emit('userStoppedTyping', { userId: user.userId });
  }

  private async dispatchMessageNotification(
    ticketId: string,
    sender: SocketUser,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) return;

    if (sender.role === 'employee') {
      await this.notificationService.notifyAllAdmins(
        'new_message',
        `New message on ticket ${ticket.ticketNumber}`,
        ticketId,
      );
    } else {
      await this.notificationService.create(
        ticket.raisedById,
        'new_message',
        `IT support replied on your ticket ${ticket.ticketNumber}`,
        ticketId,
      );
    }
  }

  @SubscribeMessage('getPresenceSnapshot')
  async handleSnapshot(@ConnectedSocket()  client: Socket, @MessageBody() userIds: string[]) {
    // Return who is currently online, and lastSeen timestamps for the rest
    const offlineUserIds = userIds.filter((id) => !this.onlineUsers.has(id));
    const lastSeenMap = await this.getLastSeenForUsers(offlineUserIds);

    client.emit('presenceSnapshot', {
      onlineUserIds: Array.from(this.onlineUsers.keys()),
      lastSeenMap,
    });
  }

  private async getLastSeenForUsers(
    userIds: string[],
  ): Promise<Record<string, string>> {
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        lastSeen: { not: null },
      },
      select: { id: true, lastSeen: true },
    });

    const lastSeenMap: Record<string, string> = {};
    for (const u of users) {
      if (u.lastSeen) {
        lastSeenMap[u.id] = u.lastSeen.toISOString();
      }
    }
    return lastSeenMap;
  }
}
