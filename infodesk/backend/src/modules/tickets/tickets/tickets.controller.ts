import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RolesGaurd } from 'src/common/guards/roles.guard';
import { JwtAuthGaurd } from 'src/modules/auth/guards/jwt-auth.guard';
import { TicketsService } from './tickets.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { FindTicketsQueryDto } from '../dto/find-tickets-query.dto';
import { UpdateTicketStatusDto } from '../dto/update-ticket-status.dto';

@Controller('tickets')
@UseGuards(JwtAuthGaurd, RolesGaurd)
export class TicketsController {
  constructor(private ticketService: TicketsService) {}

  @Post()
  @Roles('employee')
  create(@Body() dto: CreateTicketDto, @CurrentUser() user) {
    return this.ticketService.createTicket(dto, user.userId);
  }

  @Get('my')
  @Roles('employee')
  findMine(@Query() query: FindTicketsQueryDto, @CurrentUser() user) {
    return this.ticketService.findAllTicketsForEmployee(user.userId, query);
  }

  @Get()
  @Roles('admin')
  findAll(@Query() query: FindTicketsQueryDto, @CurrentUser() user) {
    return this.ticketService.findAllTicketsForAdmin(query, user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.ticketService.findOne(id, user);
  }

  @Patch(':id')
  @Roles('employee')
  updateByEmployee(
    @Param('id') id: string,
    @Body() dto: CreateTicketDto,
    @CurrentUser() user,
  ) {
    return this.ticketService.updateEmployee(id, dto, user.userId);
  }

  @Patch(':id/status')
  @Roles('admin')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto, @CurrentUser() user) {
    return this.ticketService.updateStatus(id, dto, user.userId);
  }

  @Patch(':id/close')
  @Roles('employee')
  close(@Param('id') id: string, @CurrentUser() user) {
    return this.ticketService.closeByEmployee(id, user.userId);
  }
}
