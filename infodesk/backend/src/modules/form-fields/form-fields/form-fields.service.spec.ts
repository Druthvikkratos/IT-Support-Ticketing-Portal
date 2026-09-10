import { Test, TestingModule } from '@nestjs/testing';
import { FormFieldsService } from './form-fields.service';

describe('FormFieldsService', () => {
  let service: FormFieldsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FormFieldsService],
    }).compile();

    service = module.get<FormFieldsService>(FormFieldsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
