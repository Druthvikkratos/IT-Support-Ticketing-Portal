import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { ChatModule } from '../chat/chat/chat.module';

@Module({
  imports: [PrismaModule, ChatModule],
  providers: [TicketsService],
  controllers: [TicketsController]
})
export class TicketsModule {}
