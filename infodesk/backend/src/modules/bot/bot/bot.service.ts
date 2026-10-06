import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationService } from 'src/modules/notifications/notifications/notification.service';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';
import { UpsertBotGuideDto } from '../dto/upsert-bot-guide.dto';
import { MessageKind } from '@prisma/client';
import { CHAT_MESSAGE_EVENT } from 'src/common/events';

export const BOT_EMAIL = 'bot@infodesk.local';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private botUserId?: string;

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private event: EventEmitter2,
  ) {}

  listWithGuides() {
    return this.prisma.issueType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { botGuide: true },
    });
  }

  async upsertGuide(issueTypeId: number, dto: UpsertBotGuideDto) {
    this.logger.log(`Create Guide Started | issueTypeId=${issueTypeId}`);
    const issueType = await this.prisma.issueType.findUnique({
      where: { id: issueTypeId },
    });
    if (!issueType) {
      this.logger.warn(
        `Create Guide rejected | invalid/inactive issueTypeId=${issueTypeId}`,
      );
      throw new NotFoundException('Issue type not found');
    }
    const data = { title: dto.title, steps: dto.steps, isActive: dto.isActive };
    const guide = await this.prisma.botGuide.upsert({
      where: { issueTypeId },
      update: data,
      create: { issueTypeId, ...data },
    });
    this.logger.log(
      `Bot guide saved: issueType=${issueTypeId} steps=${dto.steps.length}`,
    );
    return guide;
  }

  async deleteGuide(issueTypeId: number) {
    await this.prisma.botGuide.deleteMany({ where: { issueTypeId } });
    this.logger.log(`Bot guide deleted: issueType=${issueTypeId}`);
  }

  async startGuide(ticket: {
    id: string;
    ticketNumber: string;
    issueTypeId: number;
    raisedById: string;
  }): Promise<boolean> {
    const guide = await this.prisma.botGuide.findFirst({
      where: { issueTypeId: ticket.issueTypeId, isActive: true },
    });
    if (!guide) return false;

    const steps = guide.steps as string[];
    const text =
      `Hi! Before we invlove the IT team, Please try these steps for "${guide.title}":\n\n` +
      steps.map((s, i) => `${i + 1}. ${s}`).join('\n');

    await this.postBotMessage(ticket.id, text, 'bot');
    await this.postBotMessage(
      ticket.id,
      'Did this fix your problem?',
      'bot_actions',
    );
    await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: { botState: 'awaiting_reply' },
    });
    await this.notificationService.create(
      ticket.raisedById,
      'new_message',
      `InfoBot has some steps for you to try on ${ticket.ticketNumber}`,
      ticket.id,
    );
    this.logger.log(`Bot guide started for ticket ${ticket.id}`);
    return true;
  }

  async resolve(ticketId: string, userId: string) {
    const ticket = await this.loadOwnTicket(ticketId, userId);

    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.ticket.updateMany({
        where: { id: ticketId, botState: 'awaiting_reply' },
        data: { status: 'closed', closedAt: new Date(), botState: 'resolved' },
      });
      if (changed.count === 0)
        throw new BadRequestException(
          'The bot is not waiting for a reply on this ticket',
        );
      await tx.ticketStatusHistory.create({
        data: {
          ticketId,
          oldStatus: ticket.status,
          newStatus: 'closed',
          changedById: userId,
        },
      });
    });

    await this.postBotMessage(
      ticketId,
      'Glad that fixed it! I have closed this ticket for you.',
      'bot',
    );
    this.logger.log(`Ticket ${ticketId} resolved via bot`);
    return { success: true };
  }

  async escalate(ticketId: string, userId: string) {
    const ticket = await this.loadOwnTicket(ticketId, userId);
    const changed = await this.prisma.ticket.updateMany({
      where: { id: ticketId, botState: 'awaiting_reply' },
      data: { botState: 'escalated' },
    });
    if (changed.count === 0)
      throw new BadRequestException(
        'The bot is not waiting for a reply on this ticket',
      );
    await this.postBotMessage(
      ticketId,
      'Sorry those steps did not help. I have alerted the IT team — an admin will pick this up shortly.',
      'bot',
    );
    await this.notificationService.notifyAllAdmins(
      'ticket_raised',
      `Ticket ${ticket.ticketNumber} needs attention (bot steps did not fix it)`,
      ticketId,
    );
    this.logger.log(`Ticket ${ticketId} escalated to admins`);
    return { sucess: true };
  }

  private async loadOwnTicket(ticketId: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket || ticket.isDeleted)
      throw new NotFoundException('Ticket not found');
    if (ticket.raisedById !== userId)
      throw new ForbiddenException('You do not have access to this ticket');
    return ticket;
  }

  private async postBotMessage(
    ticketId: string,
    text: string,
    kind: MessageKind,
  ) {
    const senderId = await this.getBotUserId();
    const message = await this.prisma.ticketMessage.create({
      data: { ticketId, senderId, message: text, kind },
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
    this.event.emit(CHAT_MESSAGE_EVENT, message);
    return message;
  }

  private async getBotUserId(): Promise<string> {
    if (this.botUserId) return this.botUserId;
    const bot = await this.prisma.user.findUnique({
      where: { email: BOT_EMAIL },
    });
    if (!bot)
      throw new Error('InfoBot user is missing — run "npx prisma db seed"');
    this.botUserId = bot.id;
    return bot.id;
  }
}
