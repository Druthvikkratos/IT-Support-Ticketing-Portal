import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { fromFile, mimeTypes } from 'file-type';
import { unlink } from 'fs/promises';
import {
  FILE_CATEGORIES,
  FileCategory,
} from 'src/common/constants/file-categories';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';

@Injectable()
export class AttachementsService {
  private readonly logger = new Logger(AttachementsService.name);
  constructor(private prisma: PrismaService) {}

  async uploadForField(
    ticketId: string,
    fieldId: number,
    files: Express.Multer.File[],
    uploadedById: string,
  ) {
    try {
      this.logger.log(
        `Starting file upload | ticketId=${ticketId} | fieldId=${fieldId} | uploadedById=${uploadedById} | fileCount=${files.length}`,
      );
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket || ticket.isDeleted) {
        this.logger.warn(`Ticket not found | ticketId=${ticketId}`);
        await this.cleanUpFiles(files);
        throw new NotFoundException('Ticket not found');
      }
      if (ticket.raisedById !== uploadedById) {
        this.logger.warn(
          `Unauthorized attachment upload attempt | ticketId=${ticketId} | uploadedById=${uploadedById}`,
        );
        await this.cleanUpFiles(files);
        throw new ForbiddenException('You do not have access to this ticket');
      }

      if (ticket.status === 'closed') {
        this.logger.warn(
          `Attachment upload attempted on closed ticket | ticketId=${ticketId}`,
        );
        await this.cleanUpFiles(files);
        throw new BadRequestException(
          'Cannot add attachments to a closed ticket',
        );
      }

      const field = await this.prisma.formField.findUnique({
        where: { id: fieldId },
      });
      if (!field || field.fieldType !== 'file') {
        this.logger.warn(
          `Invalid file field | fieldId=${fieldId} | ticketId=${ticketId}`,
        );
        await this.cleanUpFiles(files);
        throw new BadRequestException('Invalid file field');
      }

      const fileConfig = field.fileConfig as {
        allowedCategories: string[];
        allowMultiple: boolean;
        maxSizeMB: number;
      } | null;

      if (!fileConfig) {
        this.logger.warn(
          `File field has no upload configuration | fieldId=${fieldId}`,
        );
        await this.cleanUpFiles(files);
        throw new BadRequestException('This field has no upload configuration');
      }
      if (!fileConfig.allowMultiple && files.length > 1) {
        this.logger.warn(
          `Multiple files uploaded to single-file field | fieldId=${fieldId} | count=${files.length}`,
        );
        await this.cleanUpFiles(files);
        throw new BadRequestException('This field only accepts a single file');
      }
      const maxSizeBytes = fileConfig.maxSizeMB * 1024 * 1024;
      // Explicit type fixes the "never[]" error
      const savedAttachments: {
        file: Express.Multer.File;
        detectedMime: string;
      }[] = [];
      // Validate EVERY file before saving any attachment
      for (const file of files) {
        this.logger.log(
          `Validating file | name=${file.originalname} | size=${file.size} | mimetype=${file.mimetype}`,
        );
        // File size validation
        if (file.size > maxSizeBytes) {
          this.logger.warn(
            `File size exceeded | name=${file.originalname} | sizeMB=${(
              file.size /
              1024 /
              1024
            ).toFixed(1)} | maxMB=${fileConfig.maxSizeMB}`,
          );
          await this.cleanUpFiles(files);
          throw new BadRequestException(
            `"${file.originalname}" is ${(file.size / 1024 / 1024).toFixed(
              1,
            )}MB, which exceeds the ${fileConfig.maxSizeMB}MB limit for this field`,
          );
        }
        // Real file type detection
        const detected = await fromFile(file.path);
        if (!detected) {
          this.logger.warn(
            `File type could not be detected | name=${file.originalname}`,
          );
          await this.cleanUpFiles(files);
          throw new BadRequestException(
            `"${file.originalname}" could not be verified as a valid file and was rejected`,
          );
        }
        this.logger.log(
          `Detected file type | name=${file.originalname} | detectedMime=${detected.mime}`,
        );
        // Allowed category validation
        const matchesAnAllowedCategory = fileConfig.allowedCategories.some(
          (category) =>
            (
              FILE_CATEGORIES[category as FileCategory]
                ?.mimeTypes as readonly string[]
            )?.includes(detected.mime),
        );
        if (!matchesAnAllowedCategory) {
          this.logger.warn(
            `File type rejected | name=${file.originalname} | detectedMime=${detected.mime} | allowedCategories=${fileConfig.allowedCategories.join(
              ',',
            )}`,
          );
          await this.cleanUpFiles(files);
          throw new BadRequestException(
            `"${file.originalname}" is actually a ${detected.mime} file, which is not an allowed type for this field. ` +
              `If this file was renamed, please upload it with its correct format.`,
          );
        }
        // File passed validation
        savedAttachments.push({
          file,
          detectedMime: detected.mime,
        });

        this.logger.log(
          `File validation passed | name=${file.originalname} | detectedMime=${detected.mime}`,
        );
      }
      this.logger.log(
        `All files validated successfully | ticketId=${ticketId} | fieldId=${fieldId} | count=${savedAttachments.length}`,
      );
      return Promise.all(
        savedAttachments.map(({ file, detectedMime }) =>
          this.prisma.ticketAttachment.create({
            data: {
              ticketId,
              fieldId,
              originalName: file.originalname,
              filePath: file.path,
              fileSize: file.size,
              detectedMime,
              uploadedById,
            },
          }),
        ),
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Unexpected error during file upload | ticketId=${ticketId} | fieldId=${fieldId}`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.cleanUpFiles(files);
      throw new InternalServerErrorException(
        'An unexpected error occurred while uploading the files',
      );
    }
  }

  async findByTicket(ticketId: string) {
    this.logger.log(`Find ticket started | ticketId=${ticketId}`);
    try {
      const ticket = this.prisma.ticketAttachment.findMany({
        where: { ticketId },
        orderBy: { uploadedAt: 'asc' },
      });
      this.logger.log(`Find ticket completed | ticketId=${ticketId}`);
      return ticket;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Find ticket failed | ticketId=${ticketId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException('Failed to fetch ticket');
    }
  }

  async getForDownload(
    attachementId: string,
    requestingUser: { userId: string; role: string },
  ) {
    try {
      this.logger.log(
        `Download request started | attachmentId=${attachementId} | userId=${requestingUser.userId} | role=${requestingUser.role}`,
      );
      const attachment = await this.prisma.ticketAttachment.findUnique({
        where: { id: attachementId },
        include: { ticket: { select: { raisedById: true } } },
      });
      if (!attachment) {
        this.logger.warn(
          `Attachment not found | attachmentId=${attachementId} | userId=${requestingUser.userId}`,
        );
        throw new NotFoundException('Attachment not found');
      }
      this.logger.log(
        `Attachment found | attachmentId=${attachementId} | ticketId=${attachment.ticketId}`,
      );
      if (
        requestingUser.role === 'employee' &&
        attachment.ticket.raisedById !== requestingUser.userId
      ) {
        this.logger.warn(
          `Unauthorized attachment download attempt | attachmentId=${attachementId} | ticketId=${attachment.ticketId} | userId=${requestingUser.userId}`,
        );
        throw new ForbiddenException('You do not have access to this file');
      }
      this.logger.log(
        `Attachment download authorized | attachmentId=${attachementId} | userId=${requestingUser.userId}`,
      );
      return attachment;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Unexpected error while fetching attachment | attachmentId=${attachementId} | userId=${requestingUser.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'An unexpected error occurred while downloading the attachment',
      );
    }
  }

  async uploadChatAttachment(
    ticketId: string,
    user: { userId: string; role: Role },
    file: Express.Multer.File,
  ) {
    try {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
      });
      if (!ticket || ticket.isDeleted) {
        await this.cleanupSingle(file);
        this.logger.warn(
          `Chat attachement rejected:  ticket ${ticket} not found`,
        );
        throw new NotFoundException('Ticket not found');
      }
      if (user.role === Role.employee && ticket.raisedById !== user.userId) {
        await this.cleanupSingle(file);
        this.logger.warn(
          `SECURITY: user ${user.userId} tried to upload a chat file to ticket ${ticket} they dont own`,
        );
        throw new ForbiddenException('You do not have access to this ticket');
      }
      if (ticket.status === 'closed') {
        await this.cleanupSingle(file);
        throw new BadRequestException('Cannot attach files to a closed ticket');
      }
      const allowedMimeTypes: string[] = [
        ...FILE_CATEGORIES.image.mimeTypes,
        ...FILE_CATEGORIES.pdf.mimeTypes,
        ...FILE_CATEGORIES.excel.mimeTypes,
        ...FILE_CATEGORIES.document.mimeTypes,
      ];
      const detected = await fromFile(file.path);
      if (!detected || !allowedMimeTypes.includes(detected.mime)) {
        await this.cleanupSingle(file);
        this.logger.warn(
          `SECURITY: chat file "${file.originalname}" rejected — sniffed as ${detected?.mime ?? 'unknown'}`,
        );
        throw new BadRequestException(
          'This file type is not supported in chat. Allowed: images, PDF, Excel, Word documents.',
        );
      }

      const attachment = await this.prisma.ticketAttachment.create({
        data: {
          ticketId,
          fieldId: null,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          detectedMime: detected.mime,
          uploadedById: user.userId,
        },
      });
      this.logger.log(
        `Chat attachment saved: id=${attachment.id} ticket=${ticketId}`,
      );
      return attachment;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      )
        throw error;
      this.logger.error(
        `Unexpected error uploading chat attachment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async cleanUpFiles(files: Express.Multer.File[]) {
    try {
      this.logger.log(`Starting file cleanup | fileCount=${files.length}`);
      await Promise.all(
        files.map(async (file) => {
          try {
            await unlink(file.path);
            this.logger.log(
              `Temporary file deleted | name=${file.originalname} | path=${file.path}`,
            );
          } catch (error) {
            this.logger.warn(
              `Could not delete temporary file | name=${file.originalname} | path=${file.path} | reason=${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }),
      );
      this.logger.log(`File cleanup completed | fileCount=${files.length}`);
    } catch (error) {
      this.logger.error(
        `Unexpected error during file cleanup`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async cleanupSingle(file: Express.Multer.File) {
    await unlink(file.path).catch((err) =>
      this.logger.warn(`Could not clean up rejected file: ${err.message}`),
    );
  }
}
