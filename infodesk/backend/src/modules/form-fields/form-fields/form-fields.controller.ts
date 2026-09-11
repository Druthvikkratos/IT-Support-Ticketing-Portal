import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { FormFieldsService } from './form-fields.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateFormFieldDto } from '../dto/create-form-field.dto';
import { ReorderFromFieldsDto } from '../dto/reorder-form-fields.dto';
import { UpdateFormFieldDto } from '../dto/update-form-field.dto';

@Controller('form-fields')
export class FormFieldsController {
  constructor(private formFieldsService: FormFieldsService) {}

  @Get('active')
  findAllActiveFormFields() {
    return this.formFieldsService.findAllActiveFormFields();
  }

  @Get()
  @Roles('admin')
  findAllActiveFormFieldsFormAdmin() {
    return this.formFieldsService.findAllActiveFormFieldsFormAdmin();
  }

  @Post()
  @Roles('admin')
  createFormFields(@Body() dto: CreateFormFieldDto) {
    return this.formFieldsService.createFormFields(dto);
  }

  @Patch('reorder')
  @Roles('admin')
  reorderFormFields(@Body() dto: ReorderFromFieldsDto) {
    return this.formFieldsService.reorderFormFields(dto);
  }

  @Patch(':id')
  @Roles('admin')
  updateFormField(
    @Param('id', ParseIntPipe) id: number,
    @Body() formFieldDto: UpdateFormFieldDto,
  ) {
    return this.formFieldsService.updateFormField(id, formFieldDto);
  }

  @Patch(':id/toggle-active')
  @Roles('admin')
  toggleActiveFormField(@Param('id', ParseIntPipe) id: number) {
    return this.formFieldsService.toggleActiveFormField(id);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number){
    return this.formFieldsService.remove(id)
  }
}
