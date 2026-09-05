import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth/auth.module';
import { UsersModule } from './modules/users/users/users.module';
import { IssueTypesModule } from './modules/issue-types/issue-types/issue-types.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, IssueTypesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
