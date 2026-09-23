import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, Role } from '@prisma/client';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    type: NotificationType,
    message: string,
    ticketId?: string,
  ) {
    try {
      const notification = await this.prisma.notification.create({
        data: { userId, type, message, ticketId },
      });
      this.logger.log(
        `Notification created: user=${userId} type=${type} ticket=${ticketId ?? 'n/a'}`,
      );
      return notification;
    } catch (error: any) {
      this.logger.error(
        `Failed to create notification for user ${userId}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async notifyAllAdmins(
    type: NotificationType,
    message: string,
    ticketId?: string,
  ) {
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: Role.admin, isActive: true },
      });
      await Promise.all(
        admins.map((admin) => this.create(admin.id, type, message, ticketId)),
      );
      this.logger.log(`Notified ${admins.length} admin(s): ${type}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to notify admins: ${error.message}`,
        error.stack,
      );
    }
  }

  async findAllForUser(userId: string, limit = 20) {
    try {
      return await this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch notifications for user ${userId}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.prisma.notification.count({
        where: { userId, isRead: false },
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to count unread notifications for user ${userId}: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  async markAsRead(id: string, userId: string) {
    try {
      const result = await this.prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true },
      });
      this.logger.log(
        `Notification ${id} marked read (matched: ${result.count})`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `Failed to mark notification ${id} as read: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async markAllAsRead(userId: string) {
    try {
      const result = await this.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      this.logger.log(
        `Marked ${result.count} notification read for user ${userId}`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `Failed to mark all notifications read for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
