import { Controller, Get, Logger, Query, Res, UseGuards } from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGaurd } from 'src/common/guards/roles.guard';
import { JwtAuthGaurd } from 'src/modules/auth/guards/jwt-auth.guard';
import { ReportService } from './report.service';
import express from 'express';

@Controller('reports')
@UseGuards(JwtAuthGaurd, RolesGaurd)
@Roles('admin')
export class ReportController {
  private readonly logger = new Logger(ReportController.name);

  constructor(private reportsService: ReportService) {}

  @Get('tickets')
  async downloadTicketReport(
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Res() res: express.Response,
  ) {
    const buffer = await this.reportsService.generateTicketReport(
      dateFrom,
      dateTo,
    );

    const filename = `InfoDesk-Ticket-Report-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

    this.logger.log(`Report downloaded: ${filename}`);
  }
}
