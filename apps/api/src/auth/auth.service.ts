import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private async buildUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: { include: { permissions: { include: { permission: true } } } }, hotel: true },
    });
    if (!user || !user.active) throw new UnauthorizedException('Usuario inválido o inactivo');

    const permissions = user.role.permissions.map((rp) => rp.permission.code);
    return { user, permissions };
  }

  private signTokens(payload: { userId: string; hotelId: string; email: string; firstName: string; lastName: string; role: string; permissions: string[] }) {
    const accessToken = this.jwt.sign(
      {
        sub: payload.userId,
        hotelId: payload.hotelId,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: payload.role,
        permissions: payload.permissions,
      },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      },
    );
    const refreshToken = this.jwt.sign(
      { sub: payload.userId },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      },
    );
    return { accessToken, refreshToken };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    const { user: fullUser, permissions } = await this.buildUserProfile(user.id);
    const tokens = this.signTokens({
      userId: fullUser.id,
      hotelId: fullUser.hotelId,
      email: fullUser.email,
      firstName: fullUser.firstName,
      lastName: fullUser.lastName,
      role: fullUser.role.code,
      permissions,
    });

    return {
      ...tokens,
      user: this.toPublicUser(fullUser, permissions),
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = this.jwt.verify(refreshToken, { secret: this.config.get<string>('JWT_REFRESH_SECRET') });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const { user: fullUser, permissions } = await this.buildUserProfile(payload.sub);
    const tokens = this.signTokens({
      userId: fullUser.id,
      hotelId: fullUser.hotelId,
      email: fullUser.email,
      firstName: fullUser.firstName,
      lastName: fullUser.lastName,
      role: fullUser.role.code,
      permissions,
    });
    return { ...tokens, user: this.toPublicUser(fullUser, permissions) };
  }

  async me(userId: string) {
    const { user: fullUser, permissions } = await this.buildUserProfile(userId);
    return this.toPublicUser(fullUser, permissions);
  }

  private toPublicUser(user: any, permissions: string[]) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.code,
      roleName: user.role.name,
      permissions,
      hotel: { id: user.hotel.id, name: user.hotel.name, currency: user.hotel.currency, timezone: user.hotel.timezone },
    };
  }
}
