import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { Prisma, Role } from '@prisma/client';
import {
  generateEmployeePassword,
} from 'src/common/utils/credentials.util';
import * as bcrypt from 'bcrypt';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { FindUserQueryDto } from '../dto/find-users-query.dto';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  async createAdmin(dto: CreateAdminDto, createdById: string) {
    const existing = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new BadRequestException('Email already in use');

    const adminCount = await this.prismaService.user.count({
      where: { role: Role.admin },
    });
    if (adminCount >= 3)
      throw new BadRequestException('Maximum of 3 admins reached');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const { password, ...rest } = dto;
    const admin = await this.prismaService.user.create({
      data: { ...rest, role: Role.admin, password: passwordHash, createdById },
    });

    return admin; // no more temporaryPassword in the response — admin already knows their own password
  }

  async createEmployee(dto: CreateEmployeeDto, createdById: string) {
    const emailTaken = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });
    if (emailTaken) throw new BadRequestException('Email already in use');

    const codeTaken = await this.prismaService.user.findUnique({
      where: { employeeCode: dto.employeeCode },
    });
    if (codeTaken)
      throw new BadRequestException('Employee Code Already in use');

    const rawPassword = generateEmployeePassword(dto.employeeCode);
    const password = await bcrypt.hash(rawPassword, 10);

    const employee = await this.prismaService.user.create({
      data: { ...dto, role: Role.employee, password, createdById },
    });
    return employee;
  }

  async findAll(query: FindUserQueryDto) {
    const { role, isActive, search, page = 1, limit = 10 } = query;
    const where: Prisma.UserWhereInput = {};
    if (role) where.role;
    where.isActive = isActive ? true : false;
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
        skip: page * 1 * limit,
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
    return { data, total, page, limit, totalpages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = this.prismaService.user.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        deletedBy: { select: { id: true, name: true } },
      },
    });
    if (!user) throw new NotFoundException('User Not Found');
    return user;
  }

  async deactivate(id: string) {
    return this.prismaService.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async remove(id: string, deletedById: string) {
    const user = await this.prismaService.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User Not Found');
    if (!user.isActive)
      throw new BadRequestException('User is already inactive');
    return await this.prismaService.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedById },
    });
  }
}
