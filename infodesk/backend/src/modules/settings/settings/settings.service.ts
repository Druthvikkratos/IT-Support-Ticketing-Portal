import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';
import { UpdateSettingsDto } from '../dto/update-settings.dto';
import { SETTINGS_CHANGED_EVENT } from 'src/common/events';

@Injectable()
export class SettingsService {
    private readonly logger = new Logger(SettingsService.name)

    constructor(private prisma: PrismaService, private events: EventEmitter2){}

    async getPublic(){
        const rows = await this.prisma.appSettings.findMany({where: {key: {in : ['it_phone', 'incident_message']}}})
        const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))
        return  {
            itPhone: byKey['it_phone']?.value ?? '',
            incidentMessage: byKey['incident_message']?.value ?? '',
            incidentUpdatedAt: byKey['incident_message']?.updatedAt ?? null
        }
    }

    async update(dto: UpdateSettingsDto){
        const save = (key: string, value: string) => this.prisma.appSettings.upsert({where: {key}, update: {value}, create: {key, value}})
        if(dto.itPhone !== undefined) await save('it_phone', dto.itPhone.trim())
        if(dto.incidentMessage !== undefined) await save('incident_message', dto.incidentMessage.trim())
        const result = await this.getPublic()
        this.logger.log(`Settings updated (incident ${result.incidentMessage ? 'ACTIVE' : 'cleared'})`)
        this.events.emit(SETTINGS_CHANGED_EVENT, result)
        return result
    }
}
