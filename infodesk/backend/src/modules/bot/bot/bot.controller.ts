import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { RolesGaurd } from 'src/common/guards/roles.guard';
import { JwtAuthGaurd } from 'src/modules/auth/guards/jwt-auth.guard';
import { BotService } from './bot.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UpsertBotGuideDto } from '../dto/upsert-bot-guide.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGaurd, RolesGaurd)
export class BotController {
  constructor(private bot: BotService) {}

  @Get('bot-guides')
  @Roles('admin')
  list() {
    return this.bot.listWithGuides();
  }

  @Put('bot-guides/:issueTypeId')
  @Roles('admin')
  upsert(
    @Param('issueTypeId', ParseIntPipe) id: number,
    @Body() dto: UpsertBotGuideDto,
  ) {
    return this.bot.upsertGuide(id, dto);
  }

  @Delete('bot-guides/:issueTypeId')
  @Roles('admin')
  remove(@Param('issueTypeId', ParseIntPipe) id: number) {
    return this.bot.deleteGuide(id);
  }

  @Post('tickets/:ticketId/bot/resolved')
  @Roles('employee')
  resolved(@Param('ticketId') ticketId: string, @CurrentUser() user) {
    return this.bot.resolve(ticketId, user.userId);
  }

  @Post('tickets/:ticketId/bot/escalate')
  @Roles('employee')
  escalate(@Param('ticketId') ticketId: string, @CurrentUser() user) {
    return this.bot.escalate(ticketId, user.userId);
  }
}
