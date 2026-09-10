import { PartialType } from '@nestjs/mapped-types';
import { CreateFormFieldDto } from './create-form-field.dto';

// all fields optional on update — admin might only be renaming the label, for example
export class UpdateFormFieldDto extends PartialType(CreateFormFieldDto) {}