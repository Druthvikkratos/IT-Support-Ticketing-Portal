import { Test, TestingModule } from '@nestjs/testing';
import { AttachementsController } from './attachements.controller';

describe('AttachementsController', () => {
  let controller: AttachementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttachementsController],
    }).compile();

    controller = module.get<AttachementsController>(AttachementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
