import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CashMovementType, CashSessionStatus, PaymentMethod, PaymentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';

function summarize(session: { openingAmount: unknown; movements: { type: CashMovementType; amount: unknown }[] }) {
  const ingresos = session.movements.filter((m) => m.type === 'INGRESO').reduce((s, m) => s + Number(m.amount), 0);
  const egresos = session.movements.filter((m) => m.type === 'EGRESO').reduce((s, m) => s + Number(m.amount), 0);
  const expectedAmount = Number(session.openingAmount) + ingresos - egresos;
  return { ingresos, egresos, expectedAmount };
}

@Injectable()
export class CashService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private include() {
    return {
      movements: { orderBy: { createdAt: 'desc' as const }, include: { registeredBy: { select: { id: true, firstName: true, lastName: true } } } },
      openedBy: { select: { id: true, firstName: true, lastName: true } },
      closedBy: { select: { id: true, firstName: true, lastName: true } },
    };
  }

  list(hotelId: string) {
    return this.prisma.cashSession.findMany({ where: { hotelId }, include: this.include(), orderBy: { openedAt: 'desc' }, take: 30 });
  }

  async findOpen(hotelId: string) {
    return this.prisma.cashSession.findFirst({ where: { hotelId, status: CashSessionStatus.ABIERTA }, include: this.include() });
  }

  async findOne(hotelId: string, id: string) {
    const session = await this.prisma.cashSession.findFirst({ where: { id, hotelId }, include: this.include() });
    if (!session) throw new NotFoundException('Caja no encontrada');
    return { ...session, summary: summarize(session) };
  }

  async current(hotelId: string) {
    const session = await this.findOpen(hotelId);
    if (!session) return null;
    return { ...session, summary: summarize(session) };
  }

  async open(hotelId: string, dto: OpenCashSessionDto, userId: string) {
    const existing = await this.findOpen(hotelId);
    if (existing) throw new BadRequestException('Ya hay una caja abierta. Cerrala antes de abrir una nueva.');

    const session = await this.prisma.cashSession.create({
      data: { hotelId, openedById: userId, openingAmount: dto.openingAmount, notes: dto.notes },
      include: this.include(),
    });
    await this.audit.log({ hotelId, userId, action: 'cash.open', entityType: 'CashSession', entityId: session.id, after: session });
    return { ...session, summary: summarize(session) };
  }

  async close(hotelId: string, id: string, dto: CloseCashSessionDto, userId: string) {
    const session = await this.prisma.cashSession.findFirst({ where: { id, hotelId }, include: this.include() });
    if (!session) throw new NotFoundException('Caja no encontrada');
    if (session.status !== CashSessionStatus.ABIERTA) throw new BadRequestException('Esta caja ya está cerrada.');

    const updated = await this.prisma.cashSession.update({
      where: { id },
      data: { status: CashSessionStatus.CERRADA, closedById: userId, closedAt: new Date(), closingAmount: dto.closingAmount, notes: dto.notes ?? session.notes },
      include: this.include(),
    });
    const summary = summarize(updated);
    await this.audit.log({
      hotelId,
      userId,
      action: 'cash.close',
      entityType: 'CashSession',
      entityId: id,
      before: { status: session.status },
      after: { status: updated.status, closingAmount: dto.closingAmount, expectedAmount: summary.expectedAmount, difference: dto.closingAmount - summary.expectedAmount },
    });
    return { ...updated, summary };
  }

  async addMovement(hotelId: string, sessionId: string, dto: CreateCashMovementDto, userId: string) {
    const session = await this.prisma.cashSession.findFirst({ where: { id: sessionId, hotelId } });
    if (!session) throw new NotFoundException('Caja no encontrada');
    if (session.status !== CashSessionStatus.ABIERTA) throw new BadRequestException('No se pueden registrar movimientos en una caja cerrada.');

    const movement = await this.prisma.cashMovement.create({
      data: { hotelId, cashSessionId: sessionId, type: dto.type, concept: dto.concept, amount: dto.amount, method: dto.method, registeredById: userId },
    });
    await this.audit.log({ hotelId, userId, action: 'cash.movement.create', entityType: 'CashMovement', entityId: movement.id, after: movement });
    return movement;
  }

  /**
   * Registra automáticamente un movimiento de caja cuando se cobra un pago de una reserva,
   * si hay una caja abierta. Si no hay caja abierta, el pago igual se registra (no bloquea el
   * cobro) pero no queda reflejado en ningún arqueo hasta que se abra una caja.
   */
  async registerPaymentMovement(hotelId: string, payment: { id: string; amount: unknown; method: PaymentMethod; type: PaymentType }, concept: string, userId: string) {
    const session = await this.findOpen(hotelId);
    if (!session) return null;

    return this.prisma.cashMovement.create({
      data: {
        hotelId,
        cashSessionId: session.id,
        type: payment.type === PaymentType.DEVOLUCION ? CashMovementType.EGRESO : CashMovementType.INGRESO,
        concept,
        amount: payment.amount as number,
        method: payment.method,
        paymentId: payment.id,
        registeredById: userId,
      },
    });
  }
}
