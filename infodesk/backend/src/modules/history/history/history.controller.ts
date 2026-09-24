import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGaurd } from 'src/common/guards/roles.guard';
import { JwtAuthGaurd } from 'src/modules/auth/guards/jwt-auth.guard';
import { HistoryService } from './history.service';
import { FindHistoryQueryDto } from '../dto/find-history-query.dto';

@Controller('history')
@UseGuards(JwtAuthGaurd, RolesGaurd)
@Roles('admin')
export class HistoryController {
  constructor(private historyService: HistoryService) {}

  @Get()
  findAll(@Query() query: FindHistoryQueryDto) {
    return this.historyService.findAll(query);
  }

  @Get('actors')
  getActors() {
    return this.historyService.getDistinctActors();
  }
}
