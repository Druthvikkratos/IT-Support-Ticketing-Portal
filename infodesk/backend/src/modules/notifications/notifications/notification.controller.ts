import {
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGaurd } from 'src/modules/auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGaurd)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private notificationsService: NotificationService) {}

  @Get()
  findMine(@CurrentUser() user) {
    return this.notificationsService.findAllForUser(user.userId);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user) {
    return this.notificationsService.getUnreadCount(user.userId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user) {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user) {
    return this.notificationsService.markAllAsRead(user.userId);
  }
}
