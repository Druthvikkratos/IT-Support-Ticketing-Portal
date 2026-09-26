import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { parseEmployeeLoginIndentifier } from 'src/common/utils/credentials.util';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(identifier: string, password: string) {
    let user: any;
    const employeeCode = parseEmployeeLoginIndentifier(identifier);
    if (employeeCode) {
      user = await this.prismaService.user.findUnique({
        where: { employeeCode },
      });
    } else {
      user = await this.prismaService.user.findUnique({
        where: { email: identifier },
      });
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid Creditials');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid Creditials');
    }

    const payload = { sub: user.id, role: user.role, email: user.email };
    const token = this.jwtService.sign(payload, {
      expiresIn: (process.env.JWT_EXPIRY as any) || '10h',
    });
    return { token, user };
  }

  async getCurrentUser(userId: string) {
    const user = this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeCode: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  async resetPasswordSelfService(dto: ForgotPasswordDto) {
    const user = await this.prismaService.user.findUnique({
      where: { employeeCode: dto.employeeCode },
    });

    if (
      !user ||
      user.email.toLowerCase() !== dto.email.toLowerCase() ||
      !user.isActive
    ) {
      this.logger.warn(
        `Self-service reset failed: no match for code ${dto.employeeCode}`,
      );
      throw new BadRequestException(
        'Employee code and email do not match our records',
      );
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prismaService.user.update({
      where: { id: user.id },
      data: { password: passwordHash },
    });
    this.logger.log(
      `Password self-reset completed for employee ${user.employeeCode}`,
    );
    return { success: true };
  }
}
