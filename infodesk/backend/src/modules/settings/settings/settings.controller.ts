import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { RolesGaurd } from 'src/common/guards/roles.guard';
import { JwtAuthGaurd } from 'src/modules/auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from '../dto/update-settings.dto';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('settings')
@UseGuards(JwtAuthGaurd, RolesGaurd)
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get('public')
  getPublic() {
    return this.settings.getPublic();
  }

  @Put()
  @Roles('admin')
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }
}
