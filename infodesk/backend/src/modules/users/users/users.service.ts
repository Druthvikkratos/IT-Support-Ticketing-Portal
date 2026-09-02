import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { Role } from '@prisma/client';
import {
  generateAdminPassword,
  generateEmployeePassword,
} from 'src/common/utils/credentials.util';
import * as bcrypt from 'bcrypt';
import { CreateEmployeeDto } from '../dto/create-employee.dto';

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
    if (adminCount > 3)
      throw new BadRequestException('Maximum of 3 admins reached');

    const rawPassword = generateAdminPassword();
    const password = await bcrypt.hash(rawPassword, 10);

    const admin = await this.prismaService.user.create({
      data: { ...dto, role: Role.admin, password, createdById },
    });

    return { admin, temporaryPassword: rawPassword };
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

  async findAll() {
    return this.prismaService.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeCode: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deactivate(id: string) {
    return this.prismaService.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
