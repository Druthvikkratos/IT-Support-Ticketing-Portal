import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';
import { CreateIssueTypeDto } from '../dto/create-issue-type.dto';
import { UpdateIssueTypeDto } from '../dto/update-issue-type.dto';

@Injectable()
export class IssueTypesService {
  private readonly logger = new Logger(IssueTypesService.name);
  constructor(private prisma: PrismaService) {}

  async createIssueType(dto: CreateIssueTypeDto) {
    this.logger.log(`Creating Issue Type: ${dto.name}`);
    const existing = await this.prisma.issueType.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      this.logger.warn(
        `Issue Creation Blocked -  Already Issue Present: ${dto.name}`,
      );
      throw new BadRequestException('Issue type already exists');
    }
    this.logger.log(`Issue Type created: ${dto.name}`);
    return this.prisma.issueType.create({ data: dto });
  }

  async findAllActive() {
    this.logger.debug(`Find All Issue Type`);
    return await this.prisma.issueType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllForAdmin() {
    this.logger.debug(`Find All Issue Type For Admin`);
    return this.prisma.issueType.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async updateIssueType(id: number, dto: UpdateIssueTypeDto) {
    this.logger.log(`Updating Issue Type: ${dto.name}`);
    const issueType = await this.prisma.issueType.findUnique({ where: { id } });
    if (!issueType) {
      this.logger.warn(`Issue Type Not Found: ${id}`);
      throw new NotFoundException('Issue Type Not Found');
    }
    const nameTaken = await this.prisma.issueType.findFirst({
      where: { name: dto.name, NOT: { id } },
    });
    if (nameTaken) {
      this.logger.warn(`Issue Type Already Exists: ${id}`);
      throw new BadRequestException('Issue type name already in use');
    }
    this.logger.log(`Issue Type updated: ${dto.name}`);
    return this.prisma.issueType.update({ where: { id }, data: dto });
  }

  async toogleActive(id: number) {
    this.logger.log(`Toggle Issue Type: ${id}`);
    const issueType = await this.prisma.issueType.findUnique({ where: { id } });
    if (!issueType) {
      this.logger.warn(`Issue Type Not Found: ${id}`);
      throw new NotFoundException('Issue type not found');
    }
    this.logger.log(`Toggle updated: ${id}`);
    return this.prisma.issueType.update({
      where: { id },
      data: { isActive: !issueType.isActive },
    });
  }
}
