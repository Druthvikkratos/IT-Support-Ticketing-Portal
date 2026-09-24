import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(private prisma: PrismaService) {}

  async generateTicketReport(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<Buffer> {
    try {
      const where: any = { isDeleted: false };
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }

      if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
        throw new BadRequestException('Start date must be before end date');
      }

      const tickets = await this.prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          issueType: { select: { name: true } },
          rasiedBy: { select: { name: true, employeeCode: true, email: true } },
        },
      });
      this.logger.log(
        `Generating report: ${tickets.length} tickets, range ${dateFrom ?? 'all'} to ${dateTo ?? 'all'}`,
      );

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'InfoDesk';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Ticket Report');

      sheet.columns = [
        { header: 'Ticket Number', key: 'ticketNumber', width: 16 },
        { header: 'Title', key: 'title', width: 28 },
        { header: 'Raised By', key: 'raisedByName', width: 20 },
        { header: 'Employee Code', key: 'employeeCode', width: 14 },
        { header: 'Email', key: 'email', width: 26 },
        { header: 'Issue Type', key: 'issueType', width: 18 },
        { header: 'Priority', key: 'priority', width: 10 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Raised On', key: 'raisedOn', width: 18 },
        { header: 'Cleared On', key: 'clearedOn', width: 18 },
        { header: 'Resolution Time (hrs)', key: 'resolutionHours', width: 20 },
      ];
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0EA5E9' },
      };
      sheet.getRow(1).alignment = { vertical: 'middle' };

      for (const ticket of tickets) {
        const resolutionHours = ticket.closedAt
          ? Math.round(
              ((ticket.closedAt.getTime() - ticket.createdAt.getTime()) /
                (1000 * 60 * 60)) *
                10,
            ) / 10
          : null;
        sheet.addRow({
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          raisedByName: ticket.rasiedBy.name,
          employeeCode: ticket.rasiedBy.employeeCode ?? '-',
          email: ticket.rasiedBy.email,
          issueType: ticket.issueType.name,
          priority: ticket.priority.toUpperCase(),
          status: ticket.status.replace('_', ' ').toUpperCase(),
          raisedOn: ticket.createdAt.toLocaleString('en-IN'),
          clearedOn: ticket.closedAt
            ? ticket.closedAt.toLocaleString('en-IN')
            : '-',
          resolutionHours: resolutionHours ?? '-',
        });
      }
      sheet.views = [{ state: 'frozen', ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();
      this.logger.log(`Report generated successfully: ${tickets.length} rows`);
      return buffer as unknown as Buffer;
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(
        `Failed to generate ticket report: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
