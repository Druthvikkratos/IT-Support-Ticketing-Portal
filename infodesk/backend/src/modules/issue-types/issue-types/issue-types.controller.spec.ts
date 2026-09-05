import { Test, TestingModule } from '@nestjs/testing';
import { IssueTypesController } from './issue-types.controller';

describe('IssueTypesController', () => {
  let controller: IssueTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IssueTypesController],
    }).compile();

    controller = module.get<IssueTypesController>(IssueTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
