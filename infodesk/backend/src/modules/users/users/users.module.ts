import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { NotificationModule } from 'src/modules/notifications/notifications/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}
