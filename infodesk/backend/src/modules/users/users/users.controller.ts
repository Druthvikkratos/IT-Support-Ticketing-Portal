import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
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

@Controller('users')
@UseGuards(JwtAuthGaurd, RolesGaurd)
export class UsersController {
  constructor(private usersSerivce: UsersService) {}

  @Post('admin')
  @Roles('admin')
  createAdmin(@Body() dto: CreateAdminDto, @CurrentUser() user) {
    return this.usersSerivce.createAdmin(dto, user.userId);
  }

  @Post('employee')
  @Roles('admin')
  createEmployee(@Body() dto: CreateEmployeeDto, @CurrentUser() user) {
    return this.usersSerivce.createEmployee(dto, user.userId);
  }

  @Get()
  @Roles('admin')
  findAll(@Query() query: FindUserQueryDto) {
    return this.usersSerivce.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersSerivce.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user) {
    return this.usersSerivce.remove(id, user.userId);
  }

  @Patch(':id/deactive')
  @Roles('admin')
  deactivate(@Param('id') id: string) {
    return this.usersSerivce.deactivate(id);
  }

  @Patch(':id/admin')
  updateAdmin(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.usersSerivce.updateAdmin(id, dto);
  }

  @Patch(':id/employee')
  updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.usersSerivce.updateEmployee(id, dto);
  }
}
