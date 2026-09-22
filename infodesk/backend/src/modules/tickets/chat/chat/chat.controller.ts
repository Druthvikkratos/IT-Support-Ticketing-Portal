import { Controller, Get, Logger, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGaurd } from 'src/modules/auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('tickets/:ticketId/messages')
@UseGuards(JwtAuthGaurd)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private chatService: ChatService) {}

  @Get()
  async findHistory(@Param('ticketId') ticketId: string, @CurrentUser() user) {
    try {
      // same ownership check as the gateway — REST and WebSocket are two
      // separate doors into the same data, both need the same lock
      await this.chatService.verifyAccess(ticketId, user);
      return await this.chatService.getHistory(ticketId);
    } catch (error: any) {
      this.logger.warn(
        `Chat history request failed for ticket ${ticketId}: ${error.message}`,
      );
      throw error;
    }
  }
}
