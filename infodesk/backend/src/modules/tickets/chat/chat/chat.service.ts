import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { fromFile } from 'file-type';
import { FILE_CATEGORIES } from 'src/common/constants/file-categories';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';
import { unlink } from 'fs/promises';

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
    attachmentId?: string,
  ) {
    this.logger.log(
      `START saveMessage: ticketId=${ticketId}, senderId=${senderId}, hasMessage=${!!message}, hasAttachment=${!!attachmentId}`,
    );
    try {
      if (!message && !attachmentId) {
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
      if (attachmentId) {
        const attachment = await this.prisma.ticketAttachment.findUnique({
          where: { id: attachmentId },
        });
        this.logger.log(
          `Checking attachment: requested id=${attachmentId}, found=${!!attachment}, attachment.ticketId=${attachment?.ticketId}, expected ticketId=${ticketId}`,
        );
        if (!attachment) {
          this.logger.warn(
            `Rejected message: attachment ${attachmentId} does not exist in the database at all`,
          );
          throw new BadRequestException('Invalid attachment');
        }
        if (attachment.ticketId !== ticketId) {
          this.logger.warn(
            `Rejected message: attachment ${attachmentId} belongs to ticket ${attachment.ticketId}, not ${ticketId}`,
          );
          throw new BadRequestException('Invalid attachment');
        }
      }
      const saved = await this.prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId,
          message,
          attachmentId,
        },
        include: {
          sender: { select: { id: true, name: true, role: true } },
          attachment: {
            select: {
              id: true,
              originalName: true,
              fileSize: true,
              detectedMime: true,
            },
          },
        },
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
      const messages = await this.prisma.ticketMessage.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, name: true, role: true } },
          attachment: {
            select: {
              id: true,
              originalName: true,
              fileSize: true,
              detectedMime: true,
            },
          },
        },
      });
      this.logger.log(
        `Fetched ${messages.length} message(s) for ticket ${ticketId}`,
      );
      return messages;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch chat history for ticket ${ticketId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async saveChatAttachment(
    ticketId: string,
    uploaderId: string,
    file: Express.Multer.File,
  ) {
    try {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
      });
      if (!ticket || ticket.isDeleted) {
        await this.cleanupFile(file);
        this.logger.warn(
          `Chat attachment rejected: ticket ${ticketId} not found`,
        );
        throw new NotFoundException('Ticket not found');
      }
      if (ticket.status === 'closed') {
        await this.cleanupFile(file);
        throw new BadRequestException('Cannot attach files to a closed ticket');
      }

      const allowedMimeTypes: readonly string[] = [
        ...FILE_CATEGORIES.image.mimeTypes,
        ...FILE_CATEGORIES.pdf.mimeTypes,
        ...FILE_CATEGORIES.excel.mimeTypes,
        ...FILE_CATEGORIES.document.mimeTypes,
      ];
      const detected = await fromFile(file.path);
      if (!detected || !allowedMimeTypes.includes(detected.mime)) {
        await this.cleanupFile(file);
        this.logger.warn(
          `SECURITY: chat attachment "${file.originalname}" rejected — sniffed as ${detected?.mime ?? 'unknown'}`,
        );
        throw new BadRequestException(
          'This file type is not supported in chat. Allowed: images, PDF, Excel, Word documents.',
        );
      }
      this.logger.log(
        `Chat attachment accepted: ticket=${ticketId} file=${file.filename}`,
      );
      return { filePath: file.path, originalName: file.originalname };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      this.logger.error(
        `Unexpected error saving chat attachment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async cleanupFile(file: Express.Multer.File) {
    await unlink(file.path).catch((err) =>
      this.logger.warn(`Could not clean up rejected chat file: ${err.message}`),
    );
  }

  async markAsRead(ticketId: string, userId: string) {
    try {
      await this.prisma.ticketMessageRead.upsert({
        where: { ticketId_userId: { ticketId, userId } },
        update: { lastReadAt: new Date() },
        create: { ticketId, userId },
      });
      this.logger.log(`Ticket ${ticketId} marked read for user ${userId}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to mark ticket ${ticketId} read for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getUnreadCount(ticketId: string, userId: string): Promise<number> {
    try {
      const readRecord = await this.prisma.ticketMessageRead.findUnique({
        where: {
          ticketId_userId: { ticketId, userId },
        },
      });
      return await this.prisma.ticketMessage.count({
        where: {
          ticketId,
          senderId: { not: userId },
          createdAt: { gt: readRecord?.lastReadAt ?? new Date(0) },
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to compute unread count: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  async getUnreadCountsForTickets(
    ticketIds: string[],
    userId: string,
  ): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    await Promise.all(
      ticketIds.map(async (id) => {
        counts[id] = await this.getUnreadCount(id, userId);
      }),
    );
    return counts;
  }
}
