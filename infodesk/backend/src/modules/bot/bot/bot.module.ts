import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { NotificationModule } from 'src/modules/notifications/notifications/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [BotService],
  controllers: [BotController],
  exports: [BotService],
})
export class BotModule {}
