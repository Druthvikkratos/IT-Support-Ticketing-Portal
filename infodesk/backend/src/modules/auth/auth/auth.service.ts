import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { parseEmployeeLoginIndentifier } from 'src/common/utils/credentials.util';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';

@Injectable()
export class AuthService {
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
}
