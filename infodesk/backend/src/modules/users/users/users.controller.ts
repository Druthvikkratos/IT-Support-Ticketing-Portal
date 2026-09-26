import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { RolesGaurd } from 'src/common/guards/roles.guard';
import { JwtAuthGaurd } from 'src/modules/auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { FindUserQueryDto } from '../dto/find-users-query.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import express from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { bulkUploadMulterOptions } from './bulk-upload-multer.config';

@Controller('users')
@UseGuards(JwtAuthGaurd, RolesGaurd)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('admin')
  @Roles('admin')
  createAdmin(@Body() dto: CreateAdminDto, @CurrentUser() user) {
    return this.usersService.createAdmin(dto, user.userId);
  }

  @Post('employee')
  @Roles('admin')
  createEmployee(@Body() dto: CreateEmployeeDto, @CurrentUser() user) {
    return this.usersService.createEmployee(dto, user.userId);
  }

  @Get()
  @Roles('admin')
  findAll(@Query() query: FindUserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user) {
    return this.usersService.remove(id, user.userId);
  }

  @Patch(':id/deactive')
  @Roles('admin')
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Patch(':id/admin')
  updateAdmin(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.usersService.updateAdmin(id, dto);
  }

  @Patch(':id/employee')
  updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.usersService.updateEmployee(id, dto);
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.usersService.reactivate(id);
  }

  @Get('bulk-upload/template')
  async downloadTemplate(@Res() res: express.Response) {
    const buffer = await this.usersService.generateBulkUploadTemplate();
    res.setHeader(
      'content-type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="InfoDesk-Bulk-Upload-Template.xlsx"',
    );
    res.send(buffer);
  }

  @Post('bulk-upload')
  @UseInterceptors(FileInterceptor('file', bulkUploadMulterOptions))
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user,
    @Res() res: express.Response,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const reportBuffer = await this.usersService.bulkCreateEmployees(
      file.buffer,
      user.userId,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="InfoDesk-Bulk-Upload-Results.xlsx"',
    );
    res.send(reportBuffer);
  }

  @Delete(':id/permanent')
  permanentDelete(@Param('id') id: string) {
    return this.usersService.permanentlyDeleteEmployee(id);
  }
}
