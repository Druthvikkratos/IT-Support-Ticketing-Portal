import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RolesGaurd } from 'src/common/guards/roles.guard';
import { JwtAuthGaurd } from 'src/modules/auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CreateEmployeeDto } from '../dto/create-employee.dto';

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
  findAll() {
    return this.usersSerivce.findAll();
  }

  @Patch(':id/deactive')
  @Roles('admin')
  deactivate(@Param('id') id: string) {
    return this.usersSerivce.deactivate(id);
  }
}
