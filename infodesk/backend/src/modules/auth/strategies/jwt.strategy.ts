import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const jwtService = process.env.JWT_SECRET;
    if (!jwtService) {
      throw new Error('Jwt Secret is not found');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['access_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtService,
    });
  }

  async validate(payload: { sub: string; role: string; email: string }) {
    return { userId: payload.sub, role: payload.role, email: payload.email };
  }
}
