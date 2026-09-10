import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';
import { CreateFormFieldDto } from '../dto/create-form-field.dto';
import { UpdateFormFieldDto } from '../dto/update-form-field.dto';
import { ReorderFromFieldsDto } from '../dto/reorder-form-fields.dto';

@Injectable()
export class FormFieldsService {
  private readonly logger = new Logger(FormFieldsService.name);
  constructor(private prismaService: PrismaService) {}

  async createFormFields(formFieldDto: CreateFormFieldDto) {
    this.logger.log(
      `Create form field started | label="${formFieldDto.label}" | fieldType="${formFieldDto.fieldType}"`,
    );
    try {
      const lastField = await this.prismaService.formField.findFirst({
        orderBy: { displayOrder: 'desc' },
      });
      const nextOrder = (lastField?.displayOrder ?? 0) + 1;
      const formField = await this.prismaService.formField.create({
        data: {
          label: formFieldDto.label,
          fieldType: formFieldDto.fieldType,
          options: formFieldDto.options ?? undefined,
          isRequired: formFieldDto.isRequired,
          displayOrder: formFieldDto.displayOrder ?? nextOrder,
        },
      });
      this.logger.log(
        `Create form field completed | id=${formField.id} | displayOrder=${formField.displayOrder}`,
      );
      return formField;
    } catch (error) {
      this.logger.error(
        `Create form field failed | label="${formFieldDto.label}"`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to create form field');
    }
  }

  async findAllActiveFormFields() {
    this.logger.log('Find active form fields started');
    try {
      const fields = await this.prismaService.formField.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          displayOrder: 'desc',
        },
      });
      this.logger.log(
        `Find active form fields completed | count=${fields.length}`,
      );
      return fields;
    } catch (error) {
      this.logger.error(
        'Find active form fields failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Failed to fetch active form fields',
      );
    }
  }

  async findAllActiveFormFieldsFormAdmin() {
    this.logger.log('Find all form fields for admin started');

    try {
      const fields = await this.prismaService.formField.findMany({
        orderBy: {
          displayOrder: 'asc',
        },
      });
      this.logger.log(
        `Find all form fields for admin completed | count=${fields.length}`,
      );
      return fields;
    } catch (error) {
      this.logger.log(
        'Find all form fields for admin failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to fetch form fields');
    }
  }

  async updateFormField(id: number, updateDtoFormField: UpdateFormFieldDto) {
    this.logger.log(`Update form field started | id = ${id}`);
    try {
      const field = await this.prismaService.formField.findUnique({
        where: {
          id,
        },
      });
      if (!field) {
        this.logger.warn(
          `Update form field failed | field not found | id=${id}`,
        );
        throw new NotFoundException('form fields not found');
      }
      const updateField = await this.prismaService.formField.update({
        where: { id },
        data:  updateDtoFormField
      });
      this.logger.log(`Update form field completed |  id=${id}`);
      return updateField;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Update form field failed | id=${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('falied to update form field');
    }
  }

  async toggleActiveFormField(id: number) {
    this.logger.log(`Toggle form field active status started | id=${id}`);
    try {
      const field = await this.prismaService.formField.findUnique({
        where: { id },
      });
      if (!field) {
        this.logger.warn(
          `Toggle form field failed | field not found | id=${id}`,
        );
        throw new NotFoundException('Form field not found');
      }
      const updatedField = await this.prismaService.formField.update({
        where: { id },
        data: {
          isActive: !field.isActive,
        },
      });
      this.logger.log(
        `Toggle form field completed | id=${id} | isActive=${updatedField.isActive}`,
      );
      return updatedField;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Toggle form field failed | id=${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Failed to update form field status',
      );
    }
  }

  async reorderFormFields(reorderFormFieldsDto: ReorderFromFieldsDto) {
    this.logger.log(
      `Reorder form fields started | count=${reorderFormFieldsDto.orderedIds.length}`,
    );

    try {
      this.prismaService.$transaction(
        reorderFormFieldsDto.orderedIds.map((id, index) =>
          this.prismaService.formField.update({
            where: { id },
            data: {
              displayOrder: index + 1,
            },
          }),
        ),
      );
      this.logger.log(
        `Reorder form fields database update completed | count=${reorderFormFieldsDto.orderedIds.length}`,
      );
      const formFields = await this.findAllActiveFormFieldsFormAdmin();
      this.logger.log('Reorder form fields completed');
      return formFields;
    } catch (error) {
      this.logger.error(
        `Reorder form fields failed | ids=${reorderFormFieldsDto.orderedIds.join(',')}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException('Failed to reorder form fields');
    }
  }
}
