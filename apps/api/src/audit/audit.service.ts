import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuditEntry {
  hotelId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Registro explícito de acciones relevantes de negocio (no un log genérico de
 * requests): cada módulo llama a audit.log(...) en los puntos que importan
 * para trazabilidad (creación/edición/cancelación de reservas, pagos,
 * check-in/out, cambios de tarifa u habitación).
 */
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entry: AuditEntry) {
    await this.prisma.auditLog.create({
      data: {
        hotelId: entry.hotelId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        before: entry.before === undefined ? undefined : (entry.before as any),
        after: entry.after === undefined ? undefined : (entry.after as any),
      },
    });
  }

  list(hotelId: string, filters: { entityType?: string; userId?: string; from?: string; to?: string }) {
    return this.prisma.auditLog.findMany({
      where: {
        hotelId,
        entityType: filters.entityType,
        userId: filters.userId,
        createdAt: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lt: filters.to ? new Date(filters.to) : undefined,
        },
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
