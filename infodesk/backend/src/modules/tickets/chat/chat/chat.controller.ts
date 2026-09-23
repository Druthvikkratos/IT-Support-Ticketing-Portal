import { Controller, ForbiddenException, Get, Logger, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGaurd } from 'src/modules/auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { chatMulterOptions } from './chat-multer.config';
import express from 'express';
import { resolve } from 'path';
import { AttachementsService } from '../../attachments/attachements/attachements.service';

@Controller('tickets/:ticketId/messages')
@UseGuards(JwtAuthGaurd)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private chatService: ChatService, private attachementsService: AttachementsService) {}

  @Get()
  async findHistory(@Param('ticketId') ticketId: string, @CurrentUser() user) {
    try {
      await this.chatService.verifyAccess(ticketId, user);
      return await this.chatService.getHistory(ticketId);
    } catch (error: any) {
      this.logger.warn(
        `Chat history request failed for ticket ${ticketId}: ${error.message}`,
      );
      throw error;
    }
  }

  @Post('attachment')
  @UseInterceptors(FileInterceptor('file', chatMulterOptions))
  async uploadAttachment(
    @Param('ticketId') ticketId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user,
  ) {
    return this.attachementsService.uploadChatAttachment(ticketId, user, file)
  }

  @Get('attachment/view')
  async viewAttachment(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user,
    @Res() res: express.Response,
  ) {
    const filePath = res.req.query['path'] as string;
    if (!filePath || !filePath.startsWith(`assets/ticket-attachments/${ticketId}/chat/`)) {
      this.logger.warn(`SECURITY: rejected attachment view request with suspicious path: ${filePath}`);
      throw new ForbiddenException('Invalid file path');
    }

    await this.chatService.verifyAccess(ticketId, user);
    res.sendFile(resolve(filePath));
  }
  
}
