import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RolesGaurd } from 'src/common/guards/roles.guard';
import { JwtAuthGaurd } from 'src/modules/auth/guards/jwt-auth.guard';
import { IssueTypesService } from './issue-type.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateIssueTypeDto } from '../dto/create-issue-type.dto';
import { UpdateIssueTypeDto } from '../dto/update-issue-type.dto';

@Controller('issue-types')
@UseGuards(JwtAuthGaurd, RolesGaurd)
export class IssueTypesController {
  constructor(private issueTypesService: IssueTypesService) {}

  @Get('active')
  findAllActive() {
    return this.issueTypesService.findAllActive();
  }

  @Get()
  @Roles('admin')
  findAllForAdmin() {
    return this.issueTypesService.findAllForAdmin();
  }

  @Post()
  @Roles('admin')
  createIssueType(@Body() dto: CreateIssueTypeDto) {
    return this.issueTypesService.createIssueType(dto);
  }

  @Patch(':id')
  @Roles('admin')
  updateIssueType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIssueTypeDto,
  ) {
    return this.issueTypesService.updateIssueType(id, dto);
  }

  @Patch(':id/toggle-active')
  @Roles('admin')
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.issueTypesService.toogleActive(id);
  }
}
