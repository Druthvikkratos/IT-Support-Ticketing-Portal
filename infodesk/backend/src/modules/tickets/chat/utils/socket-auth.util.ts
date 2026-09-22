import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import * as cookie from 'cookie';

const logger = new Logger('SocketAuth');

export interface SocketUser {
  userId: string;
  role: 'admin' | 'employee';
  email: string;
}

export function getUserFromSocket(
  client: Socket,
  jwtService: JwtService,
): SocketUser | null {
  try {
    const rawCookies = client.handshake.headers.cookie;
    if (!rawCookies) {
      logger.warn(`Socket ${client.id} connected with no cookies at all`);
      return null;
    }
    const parsed = cookie.parseCookie(rawCookies);
    const token = parsed['access_token'];
    if (!token) {
      logger.warn(`Socket ${client.id} has cookies but no access_token`);
      return null;
    }
    const payload = jwtService.verify(token, {
      secret: process.env.JWT_SECRET,
    });
    return { userId: payload.sub, role: payload.role, email: payload.email };
  } catch (error: any) {
    logger.warn(
      `Socket ${client.id} failed JWT verification: ${error.message}`,
    );
    return null;
  }
}
