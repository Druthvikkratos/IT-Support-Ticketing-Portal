import { Injectable, Logger } from '@nestjs/common';
import { Priority, TicketStatus } from '@prisma/client';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';

const ALL_STATUSES: TicketStatus[] = [
  'raised',
  'pending',
  'in_progress',
  'solved',
  'closed',
];
const ALL_PRIORITIES: Priority[] = ['low', 'high'];

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private prisma: PrismaService) {}

  async getAdminSummary() {
    try {
      const [statusCounts, priorityCounts, trend, activityFeed] =
        await Promise.all([
          this.getStatusCounts(),
          this.getPriorityCounts(),
          this.getTicketTrend(),
          this.getActivityFeed(),
        ]);
      this.logger.log('Admin dashboard summary generated');
      return { statusCounts, priorityCounts, trend, activityFeed };
    } catch (error: any) {
      this.logger.error(
        `Failed to build admin dashboard summary: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getEmployeeSummary(userId: string) {
    try {
      const [statusCounts, activityFeed] = await Promise.all([
        this.getStatusCounts(userId),
        this.getActivityFeed(20, userId),
      ]);
      this.logger.log('Employee dashboard summary generated');
      return { statusCounts, activityFeed };
    } catch (error: any) {
      this.logger.error(
        `Failed to build employee dashboard summary: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async getStatusCounts(raisedById?: string) {
    const where = { isDeleted: false, ...(raisedById ? { raisedById } : {}) };

    const group = await this.prisma.ticket.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const counts: Record<string, number> = {};
    for (const status of ALL_STATUSES) counts[status] = 0;
    for (const g of group) counts[g.status] = g._count;

    return counts;
  }

  private async getPriorityCounts() {
    const group = await this.prisma.ticket.groupBy({
      by: ['priority'],
      where: { isDeleted: false },
      _count: true,
    });
    const counts: Record<string, number> = {};
    for (const p of ALL_PRIORITIES) counts[p] = 0;
    for (const g of group) counts[g.priority] = g._count;

    return counts;
  }

  // private async getTicketTrend() {
  //   try {
  //     const rows = await this.prisma.$queryRaw<
  //       { day: Date; count: bigint }[]
  //     >`SELECT DATE(created_at) as day, COUNT(*) as count
  //           FROM tickets
  //           WHERE is_deleted = 0 AND created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
  //           GROUP BY DATE(created_at)
  //           ORDER BY day ASC`;
  //     console.log('ROWS FROM DB:', rows);
  //     console.log('ROWS LENGTH:', rows.length);
  //     console.log('BEFORE LOOP');
  //     const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });
  //     const result: { date: string; count: number }[] = [];
  //     for (let i = 13; i >= 0; i++) {
  //       const d = new Date();
  //       d.setDate(d.getDate() - i);
  //       const dateStr = fmt.format(d);
  //       console.log('ROWS:', rows);
  //       const match = rows.find(
  //         (r) => new Date(r.day).toISOString().split('T')[0] === dateStr,
  //       );
  //       console.log('MATCH:', match);
  //       result.push({ date: dateStr, count: match ? Number(match.count) : 0 });
  //     }
  //     console.log('FINAL RESULT:', result);
  //     return result;
  //   } catch (error: any) {
  //     this.logger.error(
  //       `Failed to compute ticket trend: ${error.message}`,
  //       error.stack,
  //     );
  //     return [];
  //   }
  // }

  private async getTicketTrend() {
  try {
    const rows = await this.prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS count
      FROM tickets
      WHERE is_deleted = false
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY day ASC
    `;

    const counts = new Map(rows.map((r) => [r.day, Number(r.count)]));

    // today's calendar date as "YYYY-MM-DD" (set this to your DB's timezone)
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
    }).format(new Date());
    const [y, m, d] = todayStr.split('-').map(Number);

    const result: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      // pure UTC arithmetic on the calendar date, so no local timezone shifts
      const dateStr = new Date(Date.UTC(y, m - 1, d - i))
        .toISOString()
        .split('T')[0];
      result.push({ date: dateStr, count: counts.get(dateStr) ?? 0 });
    }
    return result;
  } catch (error: any) {
    this.logger.error(`Failed to compute ticket trend: ${error.message}`, error.stack);
    return [];
  }
}

  private async getActivityFeed(limit = 20, raisedById?: string) {
    const ticketFilter = raisedById
      ? { raisedById, isDeleted: false }
      : { isDeleted: false };

    const [statusEvent, messageEvent] = await Promise.all([
      this.prisma.ticketStatusHistory.findMany({
        where: { ticket: ticketFilter },
        orderBy: { changedAt: 'desc' },
        take: limit,
        include: {
          ticket: { select: { id: true, ticketNumber: true, priority: true } },
          changedBy: { select: { id: true, name: true, role: true } },
        },
      }),
      this.prisma.ticketMessage.findMany({
        where: { ticket: ticketFilter },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          ticket: { select: { id: true, ticketNumber: true, priority: true } },
          sender: { select: { id: true, name: true, role: true } },
        },
      }),
    ]);
    const normalized = [
      ...statusEvent.map((e) => ({
        id: `status-${e.id}`,
        type: 'status_change' as const,
        ticketId: e.ticket.id,
        ticketNumber: e.ticket.ticketNumber,
        priority: e.ticket.priority,
        actorName: e.changedBy.name,
        actorRole: e.changedBy.role,
        label: e.oldStatus
          ? `${e.oldStatus} -> ${e.newStatus}`
          : 'Ticket Raised',
        createdAt: e.changedAt,
      })),
      ...messageEvent.map((m) => ({
        id: `message - ${m.id}`,
        type: 'message' as const,
        ticketId: m.ticket.id,
        ticketNumber: m.ticket.ticketNumber,
        priority: m.ticket.priority,
        actorName: m.sender.name,
        actorRole: m.sender.role,
        label: 'sent a message',
        createdAt: m.createdAt,
      })),
    ];
    return normalized
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);
  }
}
