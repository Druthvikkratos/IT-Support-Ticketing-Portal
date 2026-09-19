import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth/auth.module';
import { UsersModule } from './modules/users/users/users.module';
import { IssueTypesModule } from './modules/issue-types/issue-types/issue-types.module';
import { FormFieldsModule } from './modules/form-fields/form-fields/form-fields.module';
import { TicketsModule } from './modules/tickets/tickets/tickets.module';
import { AttachementsModule } from './modules/tickets/attachments/attachements/attachements.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, IssueTypesModule, FormFieldsModule, TicketsModule, AttachementsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
