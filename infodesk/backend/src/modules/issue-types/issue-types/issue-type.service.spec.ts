import { Test, TestingModule } from '@nestjs/testing';
import { IssueTypeServiceService } from './issue-type-service.service';

describe('IssueTypeServiceService', () => {
  let service: IssueTypeServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IssueTypeServiceService],
    }).compile();

    service = module.get<IssueTypeServiceService>(IssueTypeServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
