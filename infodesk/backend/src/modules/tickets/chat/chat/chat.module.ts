import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { AttachementsModule } from '../../attachments/attachements/attachements.module';
import { NotificationModule } from 'src/modules/notifications/notifications/notification.module';

@Module({
   imports: [
    PrismaModule,
    AttachementsModule,
    NotificationModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
  exports:[ChatService]
})
export class ChatModule {}
