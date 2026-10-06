import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { ChatModule } from '../chat/chat/chat.module';
import { NotificationModule } from 'src/modules/notifications/notifications/notification.module';
import { BotModule } from 'src/modules/bot/bot/bot.module';

@Module({
  imports: [PrismaModule, ChatModule, NotificationModule, BotModule],
  providers: [TicketsService],
  controllers: [TicketsController]
})
export class TicketsModule {}
