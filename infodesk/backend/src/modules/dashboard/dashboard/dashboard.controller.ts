import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { RolesGaurd } from 'src/common/guards/roles.guard';
import { JwtAuthGaurd } from 'src/modules/auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGaurd, RolesGaurd)
export class DashboardController {
    private readonly logger = new Logger(DashboardController.name)

    constructor(private dashboardService: DashboardService){}

    @Get('admin')
    @Roles('admin')
    getAdminSummary(){
        return this.dashboardService.getAdminSummary()
    }

    @Get('employee')
    @Roles('employee')
    getEmployeeSummary(@CurrentUser() user){
       return this.dashboardService.getEmployeeSummary(user.userId)
    }

    
}
