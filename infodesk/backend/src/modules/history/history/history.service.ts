import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';
import { FindHistoryQueryDto } from '../dto/find-history-query.dto';
import { contains } from 'class-validator';

export interface HistoryEvent {
  id: string;
  type: 'status_change' | 'message';
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  priority: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  label: string;
  createdAt: Date;
}

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  private readonly FETCH_CAP = 2000;

  constructor(private prisma: PrismaService) {}

  async findAll(query: FindHistoryQueryDto) {
    try {
      const {
        search,
        dateFrom,
        dateTo,
        type,
        actorId,
        page = 1,
        limit = 20,
      } = query;

      const dateFilter: any = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }

      const ticketFilter: any = { isDeleted: false };
      if (search) {
        ticketFilter.OR = [
          { ticketNumber: { contains: search } },
          { title: { contains: search } },
        ];
      }

      const events: HistoryEvent[] = [];

      if (!type || type === 'status_change') {
        const statusEvents = await this.prisma.ticketStatusHistory.findMany({
          where: {
            ticket: ticketFilter,
            ...(Object.keys(dateFilter).length
              ? { changedAt: dateFilter }
              : {}),
            ...(actorId ? { changedById: actorId } : {}),
          },
          orderBy: { changedAt: 'desc' },
          take: this.FETCH_CAP,
          include: {
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                title: true,
                priority: true,
              },
            },
            changedBy: { select: { id: true, name: true, role: true } },
          },
        });
        events.push(
          ...statusEvents.map((e) => ({
            id: `status-${e.id}`,
            type: 'status_change' as const,
            ticketId: e.ticket.id,
            ticketNumber: e.ticket.ticketNumber,
            ticketTitle: e.ticket.title,
            priority: e.ticket.priority,
            actorId: e.changedBy.id,
            actorName: e.changedBy.name,
            actorRole: e.changedBy.role,
            label: e.oldStatus
              ? `Status changed: ${e.oldStatus} → ${e.newStatus}`
              : 'Ticket raised',
            createdAt: e.changedAt,
          })),
        );
      }
      if (!type || type === 'message') {
        const messageEvents = await this.prisma.ticketMessage.findMany({
          where: {
            ticket: ticketFilter,
            ...(Object.keys(dateFilter).length
              ? { createdAt: dateFilter }
              : {}),
            ...(actorId ? { senderId: actorId } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: this.FETCH_CAP,
          include: {
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                title: true,
                priority: true,
              },
            },
            sender: { select: { id: true, name: true, role: true } },
          },
        });
        events.push(
          ...messageEvents.map((m) => ({
            id: `message-${m.id}`,
            type: 'message' as const,
            ticketId: m.ticket.id,
            ticketNumber: m.ticket.ticketNumber,
            ticketTitle: m.ticket.title,
            priority: m.ticket.priority,
            actorId: m.sender.id,
            actorName: m.sender.name,
            actorRole: m.sender.role,
            label: m.attachmentId
              ? 'Sent a message with attachment'
              : 'Sent a message',
            createdAt: m.createdAt,
          })),
        );
      }
      events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const total = events.length;
      const start = (page - 1) * limit;
      const paginated = events.slice(start, start + limit);
      this.logger.log(
        `History query: ${total} matching events, returning page ${page} (${paginated.length} items)`,
      );
      return {
        data: paginated,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch history: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getDistinctActors() {
    try {
      const [statusActors, messageActors] = await Promise.all([
        this.prisma.ticketStatusHistory.findMany({
          distinct: ['changedById'],
          select: { changedBy: { select: { id: true, name: true, role: true } } },
        }),
        this.prisma.ticketMessage.findMany({
          distinct: ['senderId'],
          select: { sender: { select: { id: true, name: true, role: true } } },
        }),
      ]);
      const map = new Map<string, { id: string; name: string; role: string }>();
      [
        ...statusActors.map((a) => a.changedBy),
        ...messageActors.map((a) => a.sender),
      ].forEach((u: any) => map.set(u.id, u));

      return Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch distinct actors: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }
}
