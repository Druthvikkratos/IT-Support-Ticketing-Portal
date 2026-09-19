import { Module } from '@nestjs/common';
import { AttachementsService } from './attachements.service';
import { AttachementsController } from './attachements.controller';
import { PrismaModule } from 'src/modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AttachementsService],
  controllers: [AttachementsController]
})
export class AttachementsModule {}
