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

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(private prismaService: PrismaService) {}

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
      where: { role: Role.admin },
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
    const { role, isActive, search, page = 1, limit = 10 } = query;
    const where: Prisma.UserWhereInput = {};
    if (role) where.role;
    where.isActive = isActive ?? true;
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
        orderBy: { createdAt: 'desc' },
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
    const user = await this.prismaService.user.findUnique({ where: { id } });
    if (!user || user.role !== Role.employee)
      throw new NotFoundException('Employee not found');
    
    const emailTaken = await this.prismaService.user.findFirst({
      where: { email: dto.email, NOT: { id } },
    });
    if (emailTaken) throw new BadRequestException('Email already in use');

    return this.prismaService.user.update({ where: { id }, data: dto });
  }
}
