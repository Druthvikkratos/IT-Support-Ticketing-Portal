import { Test, TestingModule } from '@nestjs/testing';
import { AttachementsService } from './attachements.service';

describe('AttachementsService', () => {
  let service: AttachementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttachementsService],
    }).compile();

    service = module.get<AttachementsService>(AttachementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
