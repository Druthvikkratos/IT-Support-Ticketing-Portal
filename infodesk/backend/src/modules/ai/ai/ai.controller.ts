import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { RolesGaurd } from 'src/common/guards/roles.guard';
import { JwtAuthGaurd } from 'src/modules/auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { Throttle } from '@nestjs/throttler';
import { Roles } from 'src/common/decorators/roles.decorator';
import { SuggestTicketDto } from './suggest-ticket.dto';

@Controller('ai')
@UseGuards(JwtAuthGaurd, RolesGaurd)
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('suggest-ticket')
  @Roles('employee')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  suggest(@Body() dto: SuggestTicketDto) {
    return this.aiService.suggestTicketFields(dto.title, dto.description);
  }

  @Post('tickets/:ticketId/summary')
  @Roles('admin')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  summary(@Param('ticketId') ticketId: string) {
    return this.aiService.summarizeTicketChat(ticketId);
  }
}
