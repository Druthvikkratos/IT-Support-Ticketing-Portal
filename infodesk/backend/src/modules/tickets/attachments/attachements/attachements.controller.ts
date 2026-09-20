import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { RolesGaurd } from 'src/common/guards/roles.guard';
import { JwtAuthGaurd } from 'src/modules/auth/guards/jwt-auth.guard';
import { AttachementsService } from './attachements.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  MAX_FILE_PER_REQUEST,
  attachmentMulterOptions,
} from '../multer.config';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import express from 'express';
import express_1 from 'express';
import { resolve } from 'path';

@Controller('tickets/:ticketId/attachments')
@UseGuards(JwtAuthGaurd, RolesGaurd)
export class AttachementsController {
  constructor(private attachementService: AttachementsService) {}

  @Post()
  @Roles('employee')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILE_PER_REQUEST, attachmentMulterOptions),
  )
  upload(
    @Param('ticketId') ticketId: string,
    @Body('fieldId') filedId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user,
  ) {
    return this.attachementService.uploadForField(
      ticketId,
      Number(filedId),
      files,
      user.userId,
    );
  }

  @Get()
  findAll(@Param('ticketId') ticketId: string) {
    return this.attachementService.findByTicket(ticketId);
  }

  @Get(':attachmentId/download')
  async download(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user,
    @Res() res: express.Response,
  ) {
    const attachment = await this.attachementService.getForDownload(
      attachmentId,
      user,
    );
    res.download(attachment.filePath, attachment.originalName);
  }

  @Get(':attachmentId/view')
  async view(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user,
    @Res() res: express_1.Response,
  ) {
    const attachment = await this.attachementService.getForDownload(
      attachmentId,
      user,
    );

    res.setHeader('Content-Type', attachment.detectedMime);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${attachment.originalName}"`,
    );
    res.sendFile(resolve(attachment.filePath));
  }
}
