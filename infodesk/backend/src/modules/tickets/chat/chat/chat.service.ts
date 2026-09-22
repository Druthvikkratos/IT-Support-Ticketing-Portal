import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private prisma: PrismaService) {}

  async verifyAccess(ticketId: string, user: { userId: string; role: Role }) {
    this.logger.log(
      `START verifyAccess: ticketId=${ticketId}, userId=${user.userId}, role=${user.role}`,
    );
    try {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket || ticket.isDeleted) {
        this.logger.warn(`Chat access denied: ticket ${ticketId} not found`);
        throw new NotFoundException('Ticket Not Found');
      }

      if (user.role === Role.employee && ticket.raisedById !== user.userId) {
        this.logger.warn(
          `Chat access denied: user ${user.userId} does not own ticket ${ticketId}`,
        );
        throw new ForbiddenException('You do not have access to this ticket');
      }
      this.logger.log(
        `END verifyAccess: access granted for ticketId=${ticketId}, userId=${user.userId}`,
      );
      return ticket;
    } catch (error: any) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      )
        throw error;
      this.logger.error(
        `Unexpected error verifying chat access for ticket ${ticketId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async saveMessage(
    ticketId: string,
    senderId: string,
    message?: string,
    attachmentPath?: string,
  ) {
    this.logger.log(
      `START saveMessage: ticketId=${ticketId}, senderId=${senderId}, hasMessage=${!!message}, hasAttachment=${!!attachmentPath}`,
    );
    try {
      if (!message && !attachmentPath) {
        throw new BadRequestException(
          'A message must contain text or an attachment',
        );
      }
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket || ticket.isDeleted) {
        this.logger.warn(`Chat access denied: ticket ${ticketId} not found`);
        throw new NotFoundException('Ticket Not Found');
      }
      if (ticket.status === 'closed') {
        throw new BadRequestException(
          'Cannot send messages on a closed ticket',
        );
      }

      const saved = await this.prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId,
          message,
          attachmentPath,
        },
        include: { sender: { select: { id: true, name: true, role: true } } },
      });
      this.logger.log(
        `Message saved: ticket=${ticketId} sender=${senderId} messageId=${saved.id}`,
      );
      return saved;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      this.logger.error(
        `Failed to save message for ticket ${ticketId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getHistory(ticketId: string) {
    this.logger.log(`START getHistory: ticketId=${ticketId}`);
    try {
      this.logger.log(
        `END getHistory: ticketId=${ticketId}, messageCount=${history.length}`,
      );
      return await this.prisma.ticketMessage.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { id: true, name: true, role: true } } },
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch chat history for ticket ${ticketId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
