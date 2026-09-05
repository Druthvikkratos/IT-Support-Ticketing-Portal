import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { IssueTypesController } from './issue-types.controller';
import { IssueTypesService } from './issue-type.service';

@Module({
  imports: [PrismaModule],
  controllers: [IssueTypesController],
  providers: [IssueTypesService],
})
export class IssueTypesModule {}
