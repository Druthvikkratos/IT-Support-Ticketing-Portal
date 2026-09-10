import { Test, TestingModule } from '@nestjs/testing';
import { FormFieldsController } from './form-fields.controller';

describe('FormFieldsController', () => {
  let controller: FormFieldsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormFieldsController],
    }).compile();

    controller = module.get<FormFieldsController>(FormFieldsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
