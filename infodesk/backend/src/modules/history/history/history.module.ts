import { Module } from '@nestjs/common';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { PrismaModule } from 'src/modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [HistoryService],
  controllers: [HistoryController]
})
export class HistoryModule {}
