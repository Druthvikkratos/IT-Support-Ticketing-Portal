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
    let user;

    const employeeCode = parseEmployeeLoginIndentifier(identifier);
    if (employeeCode) {
      user = this.prismaService.user.findUnique({ where: { employeeCode } });
    } else {
      user = this.prismaService.user.findUnique({
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

    const paylod = { sub: user.id, role: user.role, email: user.email };
    const token = this.jwtService.sign(paylod, { expiresIn: '24h' });
    return { token, user };
  }
}
