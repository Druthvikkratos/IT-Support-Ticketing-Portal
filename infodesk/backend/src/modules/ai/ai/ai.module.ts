import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { AiProvider } from './ai-provider';
import { OllamaProvider } from './ollama.provider';

@Module({
  imports: [PrismaModule],
  providers: [AiService, { provide: AiProvider, useClass: OllamaProvider }],
  controllers: [AiController]
})
export class AiModule {}
