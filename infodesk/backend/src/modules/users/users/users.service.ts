import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { Prisma, Role } from '@prisma/client';
import { generateEmployeePassword } from 'src/common/utils/credentials.util';
import * as bcrypt from 'bcrypt';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { FindUserQueryDto } from '../dto/find-users-query.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import * as ExcelJS from 'exceljs';
import { NotificationService } from 'src/modules/notifications/notifications/notification.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    private prismaService: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async createAdmin(dto: CreateAdminDto, createdById: string) {
    this.logger.log(
      `Creating admin: ${dto.email} (requested by ${createdById})`,
    );
    const existing = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      this.logger.warn(
        `Admin creation blocked — email already in use: ${dto.email}`,
      );
      throw new BadRequestException('Email already in use');
    }

    const adminCount = await this.prismaService.user.count({
      where: { role: Role.admin, isActive: true },
    });
    if (adminCount >= 3) {
      this.logger.warn(`Admin creation blocked — max admins (3) reached`);
      throw new BadRequestException('Maximum of 3 admins reached');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const { password, ...rest } = dto;
    const admin = await this.prismaService.user.create({
      data: { ...rest, role: Role.admin, password: passwordHash, createdById },
    });
    this.logger.log(`Admin created: ${admin.id} (${admin.email})`);
    return admin; // no more temporaryPassword in the response — admin already knows their own password
  }

  async createEmployee(dto: CreateEmployeeDto, createdById: string) {
    this.logger.log(
      `Creating employee: ${dto.email}, code ${dto.employeeCode}`,
    );
    const emailTaken = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });
    if (emailTaken) {
      this.logger.warn(
        `Employee creation blocked — email already in use: ${dto.email}`,
      );
      throw new BadRequestException('Email already in use');
    }

    const codeTaken = await this.prismaService.user.findUnique({
      where: { employeeCode: dto.employeeCode },
    });
    if (codeTaken) {
      this.logger.warn(
        `Employee creation blocked — code already in use: ${dto.employeeCode}`,
      );
      throw new BadRequestException('Employee Code Already in use');
    }

    const rawPassword = generateEmployeePassword(dto.employeeCode);
    const password = await bcrypt.hash(rawPassword, 10);

    const employee = await this.prismaService.user.create({
      data: { ...dto, role: Role.employee, password, createdById },
    });
    this.logger.log(`Employee created: ${employee.id} (${employee.email})`);
    return employee;
  }

  async findAll(query: FindUserQueryDto) {
    this.logger.debug(`findAll query: ${JSON.stringify(query)}`);
    const {
      role,
      isActive,
      search,
      page = 1,
      limit = 10,
      sortField = 'createdAt',
      sortDir = 'desc',
    } = query;
    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { employeeCode: { contains: search } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: sortDir },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          employeeCode: true,
          isActive: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true } },
        },
      }),
      this.prismaService.user.count({ where }),
    ]);
    this.logger.debug(`findAll returned ${data.length}/${total} users`);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = this.prismaService.user.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        deletedBy: { select: { id: true, name: true } },
      },
    });
    if (!user) {
      this.logger.warn(`User not found: ${id}`);
      throw new NotFoundException('User Not Found');
    }
    return user;
  }

  async deactivate(id: string) {
    this.logger.log(`Deactivating user: ${id}`);
    return this.prismaService.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async remove(id: string, deletedById: string) {
    const user = await this.prismaService.user.findUnique({ where: { id } });
    if (!user) {
      this.logger.warn(`Remove failed — user not found: ${id}`);
      throw new NotFoundException('User Not Found');
    }
    if (!user.isActive) {
      this.logger.warn(`Remove failed — user already inactive: ${id}`);
      throw new BadRequestException('User is already inactive');
    }
    this.logger.log(`Soft-deleting user ${id} (by ${deletedById})`);
    return await this.prismaService.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedById },
    });
  }

  async updateAdmin(id: string, dto: UpdateAdminDto) {
    this.logger.log(`Updating admin: ${dto.email}, email ${dto.email}`);
    const user = await this.prismaService.user.findUnique({ where: { id } });
    if (!user || user.role !== Role.admin) {
      this.logger.warn(`Admin Not Found: ${id}`);
      throw new NotFoundException('Admin not found');
    }
    const emailTaken = await this.prismaService.user.findFirst({
      where: { email: dto.email, NOT: { id } },
    });
    if (emailTaken) {
      this.logger.warn(`Email Already in Use`);
      throw new BadRequestException('Email already in use');
    }
    this.logger.log(`Admin updated: ${dto.email} (${dto.name})`);
    return this.prismaService.user.update({ where: { id }, data: dto });
  }

  async updateEmployee(id: string, dto: UpdateEmployeeDto) {
    this.logger.log(`Updating Employee: ${dto.email}, email ${dto.email}`);
    const user = await this.prismaService.user.findUnique({ where: { id } });
    if (!user || user.role !== Role.employee) {
      this.logger.warn(`Employee not found ${id} (${dto.name})`);
      throw new NotFoundException('Employee not found');
    }
    const emailTaken = await this.prismaService.user.findFirst({
      where: { email: dto.email, NOT: { id } },
    });
    if (emailTaken) {
      this.logger.warn(
        `Employee Email Already In Use ${id} email: (${dto.email})`,
      );
      throw new BadRequestException('Email already in use');
    }
    this.logger.log(`Employee updated: ${dto.email} (${dto.name})`);
    return this.prismaService.user.update({ where: { id }, data: dto });
  }

  async reactivate(id: string) {
    this.logger.log('Start: Userservice : reactivate : id =', id);
    const user = await this.prismaService.user.findUnique({ where: { id } });
    if (!user) {
      this.logger.warn(`User not found ${id}`);
      throw new NotFoundException('User not found');
    }
    if (user.isActive) {
      this.logger.warn(`User is already active ${id}`);
      throw new BadRequestException('User is already active');
    }
    this.logger.log(`User updated reactivate method`);
    this.logger.log('End: Userservice: reactivate');
    return this.prismaService.user.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedById: null },
    });
  }

  async generateBulkUploadTemplate(): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'InfoDesk';
      const sheet = workbook.addWorksheet('Employees');
      sheet.columns = [
        { header: 'employee_code', key: 'employee_code', width: 16 },
        { header: 'employee_name', key: 'employee_name', width: 26 },
        { header: 'email', key: 'email', width: 30 },
      ];
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0EA5E9' },
      };
      sheet.getColumn('employee_code').numFmt = '@';

      sheet.addRow({
        employee_code: '0101',
        employee_name: 'Jane Doe',
        email: 'jane.doe@infomapglobal.com',
      });
      sheet.getRow(2).font = { italic: true, color: { argb: 'FF94A3B8' } };

      const buffer = await workbook.xlsx.writeBuffer();
      this.logger.log('Bulk Upload template generated');
      return buffer as unknown as Buffer;
    } catch (error: any) {
      this.logger.error(
        `Failed to generate bulk upload template: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async bulkCreateEmployees(
    fileBuffer: Buffer,
    createdById: string,
  ): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new BadRequestException('Uploaded has no worksheet');
      interface RowResult {
        employee_code: string;
        employee_name: string;
        email: string;
        remark: string;
      }
      const results: RowResult[] = [];
      const seenCodes = new Set<string>();
      const seenEmails = new Set<string>();
      const readCellText = (cellValue: any): string => {
        if (cellValue === null || cellValue === undefined) return '';
        if (typeof cellValue === 'object') {
          if ('text' in cellValue) return String(cellValue.text).trim();
          if ('result' in cellValue) return String(cellValue.result).trim();
          return '';
        }
        return String(cellValue).trim();
      };
      for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
        const row = sheet.getRow(rowNumber);
        let employeeCode = readCellText(row.getCell(1).value);
        const employeeName = readCellText(row.getCell(2).value);
        const email = readCellText(row.getCell(3).value).toLowerCase();

        if (!employeeCode && !employeeName && !email) {
          continue;
        }
        if (/^\d{1,4}$/.test(employeeCode)) {
          employeeCode = employeeCode.padStart(4, '0');
        }
        let remark = 'Success';
        if (!employeeCode || !employeeName || !email) {
          remark = 'Missing required field(s)';
        } else if (!/^\d{4}$/.test(employeeCode)) {
          remark = 'Employee code must be exactly 4 digits';
        } else if (!/^\S+@\S+\.\S+$/.test(email)) {
          remark = 'Invalid email format';
        } else if (email.endsWith('@gmail.com')) {
          remark = 'Gmail not allowed';
        } else if (seenCodes.has(employeeCode)) {
          remark = 'Duplicate employee code within this file';
        } else if (seenEmails.has(email)) {
          remark = 'Duplicate email within this file';
        } else {
          const codeTaken = await this.prismaService.user.findUnique({
            where: { employeeCode },
          });
          const emailTaken = await this.prismaService.user.findUnique({
            where: { email },
          });
          if (codeTaken) remark = 'Employee code already exists in system';
          else if (emailTaken) remark = 'Email already exists in system';
        }

        if (remark === 'Success') {
          try {
            const rawPassword = generateEmployeePassword(employeeCode);
            const passwordHash = await bcrypt.hash(rawPassword, 10);
            await this.prismaService.user.create({
              data: {
                role: Role.employee,
                name: employeeName,
                employeeCode,
                email,
                password: passwordHash,
                createdById,
              },
            });
            seenCodes.add(employeeCode);
            seenEmails.add(email);
          } catch (error: any) {
            this.logger.error(
              `Row ${rowNumber} passed validation but creation failed: ${error.message}`,
              error.stack,
            );
            remark = 'Unexpected error during creation — contact support';
          }
        }
        results.push({
          employee_code: employeeCode,
          employee_name: employeeName,
          email,
          remark,
        });
      }
      const successCount = results.filter((r) => r.remark === 'Success').length;
      const failCount = results.length - successCount;
      this.logger.log(
        `Bulk upload complete: ${successCount} created, ${failCount} failed, by admin ${createdById}`,
      );
      this.notificationService
        .create(
          createdById,
          'bulk_upload_result',
          `Bulk upload complete: ${successCount} created, ${failCount} failed`,
        )
        .catch((err) =>
          this.logger.error(
            `Notification dispatch failed for bulk upload: ${err.message}`,
          ),
        );
      return this.buildBulkUploadReport(results);
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(
        `Bulk upload processing failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async buildBulkUploadReport(
    results: { employee_code: string; email: string; remark: string }[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Upload Results');

    sheet.columns = [
      { header: 'Employee Code', key: 'employee_code', width: 16 },
      { header: 'Employee Name', key: 'employee_name', width: 26 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Remark', key: 'remark', width: 36 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0EA5E9' },
    };
    for (const row of results) {
      const addedRows = sheet.addRow(row);
      const isSuccess = (row.remark = 'Success');
      addedRows.getCell('remark').font = {
        color: { argb: isSuccess ? 'FF15803D' : 'FFDC2626' },
        bold: !isSuccess,
      };
      if (!isSuccess) {
        addedRows.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEF2F2' },
          };
        });
      }
    }
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async permanentlyDeleteEmployee(id: string) {
    const user = await this.prismaService.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User Not found');
    if (user.role !== Role.employee) {
      throw new BadRequestException(
        'Only employee accounts can be permanently deleted. Deactivate admins instead.',
      );
    }
    this.logger.warn(
      `PERMANENT DELETE initiated for employee ${id} (${user.name}, ${user.employeeCode})`,
    );
    try {
      const ticketCount = await this.prismaService.$transaction(async (tx) => {
        const tickets = await tx.ticket.findMany({
          where: { raisedById: id },
          select: { id: true },
        });
        const ticketIds = tickets.map((t) => t.id);
        if (ticketIds.length > 0) {
          await tx.ticketMessage.deleteMany({
            where: { ticketId: { in: ticketIds } },
          });
          await tx.ticketStatusHistory.deleteMany({
            where: { ticketId: { in: ticketIds } },
          });
          await tx.ticketAssignmentHistory.deleteMany({
            where: { ticketId: { in: ticketIds } },
          });
          await tx.ticketAttachment.deleteMany({
            where: { ticketId: { in: ticketIds } },
          });
          await tx.ticketMessageRead.deleteMany({
            where: { ticketId: { in: ticketIds } },
          });
          await tx.ticket.deleteMany({ where: { id: { in: ticketIds } } });
        }
        await tx.notification.deleteMany({ where: { userId: id } });
        await tx.user.delete({ where: { id } });
        return ticketIds.length;
      });
      this.logger.log(
        `PERMANENT DELETE completed for employee ${id}: ${ticketCount} ticket(s) removed`,
      );
    } catch (error: any) {
      this.logger.error(
        `Permanent delete failed for employee ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
