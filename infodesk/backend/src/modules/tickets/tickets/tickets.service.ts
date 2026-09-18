import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';
import { FindTicketsQueryDto } from '../dto/find-tickets-query.dto';
import { Prisma, Role, TicketStatus } from '@prisma/client';
import { generateNextTicketNumber } from 'src/common/utils/ticket-number.util';
import { UpdateTicketStatusDto } from '../dto/update-ticket-status.dto';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  constructor(private prisma: PrismaService) {}

  async createTicket(dto: CreateTicketDto, raisedById: string) {
    this.logger.log(
      `Create ticket started | raisedById=${raisedById} | issueTypeId=${dto.issueTypeId}`,
    );
    try {
      const issueType = await this.prisma.issueType.findUnique({
        where: { id: dto.issueTypeId },
      });
      if (!issueType || !issueType.isActive) {
        this.logger.warn(
          `Create ticket rejected | invalid/inactive issueTypeId=${dto.issueTypeId} | raisedById=${raisedById}`,
        );
        throw new BadRequestException('Selected issue type is not valid');
      }
      await this.validateCustomFieldValues(dto.customFieldValues);
      return await this.prisma.$transaction(async (tx) => {
        const ticketNumber = await generateNextTicketNumber(tx as any);
        this.logger.log(
          `Creating ticket record | ticketNumber=${ticketNumber} | raisedById=${raisedById}`,
        );
        const ticket = await tx.ticket.create({
          data: {
            ticketNumber,
            title: dto.title,
            description: dto.description,
            issueTypeId: dto.issueTypeId,
            priority: dto.priority,
            phoneNumber: dto.phoneNumber,
            customFieldValues: dto.customFieldValues ?? undefined,
            raisedById,
          },
          include: {
            issueType: true,
            rasiedBy: { select: { id: true, name: true, employeeCode: true } },
          },
        });
        await this.logStatusChange(tx, ticket.id, null, 'raised', raisedById);
        this.logger.log(
          `Create ticket completed | ticketId=${ticket.id} | ticketNumber=${ticket.ticketNumber} | raisedById=${raisedById}`,
        );
        return ticket;
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Create ticket failed | raisedById=${raisedById} | issueTypeId=${dto.issueTypeId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to create ticket');
    }
  }

  private async validateCustomFieldValues(values?: Record<string, any>) {
    this.logger.log('Validate custom field values started');
    try {
      const activeFields = await this.prisma.formField.findMany({
        where: { isActive: true },
      });
      for (const field of activeFields) {
        const answer = values?.[field.id];

        if (
          field.isRequired &&
          (answer === null || answer === '' || answer === undefined)
        ) {
          this.logger.warn(
            `Custom field validation failed | fieldId=${field.id} | field=${field.label} | reason=required`,
          );
          throw new BadRequestException(`"${field.label}" is required`);
        }

        if (answer && ['dropdown', 'radio'].includes(field.fieldType)) {
          const validOptions = (field.options as string[]) ?? [];
          if (!validOptions.includes(answer)) {
            throw new BadRequestException(
              `Invalid value submitted for "${field.label}"`,
            );
          }
        }
      }
      this.logger.log(
        `Validate custom field values completed | activeFieldCount=${activeFields.length}`,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        'Validate custom field values failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Failed to validate custom field values',
      );
    }
  }

  async findAllTicketsForEmployee(userId: string, query: FindTicketsQueryDto) {
    this.logger.log(
      `Find employee tickets started | userId=${userId} | page=${query.page ?? 1} | limit=${query.limit ?? 10}`,
    );
    try {
      const result = await this.findAll({ ...query, raisedById: userId });
      this.logger.log(
        `Find employee tickets completed | userId=${userId} | total=${result.total}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Find employee tickets failed | userId=${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async findAllTicketsForAdmin(query: FindTicketsQueryDto) {
    this.logger.log(
      `Find admin tickets started | page=${query.page ?? 1} | limit=${query.limit ?? 10}`,
    );
    try {
      const result = await this.findAll(query);
      this.logger.log(`Find admin tickets completed | total=${result.total}`);
      return result;
    } catch (error) {
      this.logger.error(
        'Find admin tickets failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private async findAll(query: FindTicketsQueryDto & { raisedById?: string }) {
    const {
      search,
      status,
      priority,
      issueTypeId,
      raisedById,
      page = 1,
      limit = 10,
      sortField = 'createdAt',
      sortDir = 'desc',
    } = query;

    this.logger.log(
      `Find tickets query started | raisedById=${raisedById ?? 'all'} | status=${status ?? 'all'} | priority=${priority ?? 'all'} | issueTypeId=${issueTypeId ?? 'all'} | page=${page} | limit=${limit}`,
    );

    try {
      const where: Prisma.TicketWhereInput = { isDeleted: false };
      if (raisedById) where.raisedById = raisedById;
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (issueTypeId) where.issueTypeId = issueTypeId;
      if (search) {
        where.OR = [
          { ticketNumber: { contains: search } },
          { title: { contains: search } },
        ];
      }
      const [data, total] = await Promise.all([
        this.prisma.ticket.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { [sortField]: sortDir },
          include: {
            issueType: { select: { id: true, name: true } },
            rasiedBy: { select: { id: true, name: true, employeeCode: true } },
          },
        }),
        this.prisma.ticket.count({ where }),
      ]);
      this.logger.log(
        `Find tickets query completed | resultCount=${data.length} | total=${total} | page=${page}`,
      );
      return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    } catch (error) {
      this.logger.error(
        `Find tickets query failed | raisedById=${raisedById ?? 'all'} | page=${page}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to fetch tickets');
    }
  }

  async findOne(id: string, requestingUser: { userId: string; role: Role }) {
    this.logger.log(
      `Find ticket started | ticketId=${id} | userId=${requestingUser.userId} | role=${requestingUser.role}`,
    );
    try {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id },
        include: {
          issueType: true,
          rasiedBy: { select: { id: true, name: true, employeeCode: true } },
          statusHistory: {
            orderBy: { changedAt: 'asc' },
            include: {
              changedBy: { select: { id: true, name: true, role: true } },
            },
          },
        },
      });
      if (!ticket || ticket.isDeleted) {
        this.logger.warn(
          `Find ticket rejected | ticketId=${id} | reason=not_found | userId=${requestingUser.userId}`,
        );

        throw new NotFoundException('Ticket not found');
      }

      if (
        requestingUser.role === Role.employee &&
        requestingUser.userId !== ticket.raisedById
      ) {
        this.logger.warn(
          `Find ticket forbidden | ticketId=${id} | requestingUserId=${requestingUser.userId} | raisedById=${ticket.raisedById}`,
        );

        throw new ForbiddenException('You do not have access to this ticket');
      }
      this.logger.log(
        `Find ticket completed | ticketId=${id} | userId=${requestingUser.userId}`,
      );
      return ticket;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.logger.error(
        `Find ticket failed | ticketId=${id} | userId=${requestingUser.userId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException('Failed to fetch ticket');
    }
  }

  async updateEmployee(id: string, dto: CreateTicketDto, userId: string) {
    this.logger.log(
      `Update employee ticket started | ticketId=${id} | userId=${userId}`,
    );
    try {
      const ticket = await this.prisma.ticket.findUnique({ where: { id } });
      if (!ticket || ticket.isDeleted) {
        this.logger.warn(
          `Update employee ticket rejected | ticketId=${id} | userId=${userId} | reason=not_found`,
        );

        throw new NotFoundException('Ticket not found');
      }
      if (ticket.raisedById !== userId) {
        this.logger.warn(
          `Update employee ticket forbidden | ticketId=${id} | userId=${userId} | raisedById=${ticket.raisedById}`,
        );
        throw new ForbiddenException('You do not have access to this ticket');
      }
      if (ticket.status !== 'raised') {
        this.logger.warn(
          `Update employee ticket rejected | ticketId=${id} | userId=${userId} | currentStatus=${ticket.status} | reason=ticket_not_editable`,
        );
        throw new BadRequestException(
          'This ticket is already being worked on and can no longer be edited',
        );
      }
      await this.validateCustomFieldValues(dto.customFieldValues);

      const updatedTicket = await this.prisma.ticket.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          issueTypeId: dto.issueTypeId,
          priority: dto.priority,
          phoneNumber: dto.phoneNumber,
          customFieldValues: dto.customFieldValues ?? undefined,
        },
      });
      this.logger.log(
        `Update employee ticket completed | ticketId=${id} | userId=${userId}`,
      );
      return updatedTicket;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Update employee ticket failed | ticketId=${id} | userId=${userId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException('Failed to update ticket');
    }
  }

  async updateStatus(
    id: string,
    dto: UpdateTicketStatusDto,
    changedById: string,
  ) {
    this.logger.log(
      `Update ticket status started | ticketId=${id} | newStatus=${dto.status}`,
    );
    try {
      const ticket = await this.prisma.ticket.findUnique({ where: { id } });
      if (!ticket || ticket.isDeleted) {
        this.logger.warn(
          `Update ticket status rejected | ticketId=${id} | reason=not_found`,
        );
        throw new NotFoundException('Ticket not found');
      }
      if (ticket.status === 'closed') {
        this.logger.warn(
          `Update ticket status rejected | ticketId=${id} | reason= ticket already closed`,
        );
        throw new BadRequestException(
          'A closed ticket cannot be changed. The employee must raise a new ticket.',
        );
      }
      if (ticket.status === dto.status) {
        this.logger.warn(
          `Update ticket status rejected | ticketId=${id} | reason= ticket already in the same status so it cannot be changed`,
        );
        throw new BadRequestException(
          `Ticket is already marked as ${dto.status}`,
        );
      }
      return this.prisma.$transaction(async (tx) => {
        const updatedTicket = await this.prisma.ticket.update({
          where: { id },
          data: {
            status: dto.status,
            closedAt: dto.status === 'closed' ? new Date() : ticket.closedAt,
          },
        });
        await this.logStatusChange(
          tx,
          id,
          ticket.status,
          dto.status,
          changedById,
        );
        this.logger.log(
          `Update ticket status completed | ticketId=${id} | oldStatus=${ticket.status} | newStatus=${dto.status}`,
        );

        return updatedTicket;
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Update ticket status failed | ticketId=${id} | newStatus=${dto.status}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException('Failed to update ticket status');
    }
  }

  async closeByEmployee(id: string, userId: string) {
    this.logger.log(
      `Close ticket by employee started | ticketId=${id} | userId=${userId}`,
    );
    try {
      const ticket = await this.prisma.ticket.findUnique({ where: { id } });
      if (!ticket || ticket.isDeleted) {
        this.logger.warn(
          `Close ticket rejected | ticketId=${id} | userId=${userId} | reason=not_found`,
        );
        throw new NotFoundException('Ticket not found');
      }
      if (ticket.raisedById !== userId) {
        this.logger.warn(
          `Close ticket forbidden | ticketId=${id} | userId=${userId} | raisedById=${ticket.raisedById}`,
        );
        throw new ForbiddenException('You do not have access to this ticket');
      }
      if (ticket.status !== 'solved') {
        this.logger.warn(
          `Close ticket rejected | ticketId=${id} | userId=${userId} | currentStatus=${ticket.status} | reason=not_solved`,
        );
        throw new BadRequestException('Only a solved ticket can be closed');
      }
      return this.prisma.$transaction(async (tx) => {
        const closedTicket = await this.prisma.ticket.update({
          where: { id },
          data: {
            status: 'closed',
            closedAt: new Date(),
          },
        });
        await this.logStatusChange(tx, id, ticket.status, 'closed', userId);
        this.logger.log(
          `Close ticket by employee completed | ticketId=${id} | userId=${userId}`,
        );
        return closedTicket;
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Close ticket by employee failed | ticketId=${id} | userId=${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to close ticket');
    }
  }

  private async logStatusChange(
    tx: Prisma.TransactionClient,
    ticketId: string,
    oldStatus: TicketStatus | null,
    newStatus: TicketStatus,
    changedById: string,
  ) {
    await tx.ticketStatusHistory.create({
      data: {
        ticketId,
        oldStatus,
        newStatus,
        changedById,
      },
    });
  }
}
