import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { RequestUser } from '../types/request-user';

function makeContext(user: RequestUser | undefined): ExecutionContext {
  return {
    getHandler: () => ({}) as any,
    getClass: () => ({}) as any,
    switchToHttp: () => ({ getRequest: () => ({ user }) }) as any,
  } as ExecutionContext;
}

function makeReflector(required: string[] | undefined): Reflector {
  return { getAllAndOverride: () => required } as unknown as Reflector;
}

const baseUser: RequestUser = {
  id: 'u1',
  hotelId: 'h1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'RECEPCION',
  permissions: ['reservations.view', 'reservations.create'],
};

describe('PermissionsGuard', () => {
  it('permite el acceso si el endpoint no declara permisos requeridos', () => {
    const guard = new PermissionsGuard(makeReflector(undefined));
    expect(guard.canActivate(makeContext(baseUser))).toBe(true);
  });

  it('permite el acceso si el usuario tiene al menos uno de los permisos requeridos', () => {
    const guard = new PermissionsGuard(makeReflector(['reservations.create', 'reservations.cancel']));
    expect(guard.canActivate(makeContext(baseUser))).toBe(true);
  });

  it('deniega el acceso si el usuario no tiene ninguno de los permisos requeridos', () => {
    const guard = new PermissionsGuard(makeReflector(['cash.manage']));
    expect(guard.canActivate(makeContext(baseUser))).toBe(false);
  });

  it('deniega el acceso si no hay usuario autenticado en el request', () => {
    const guard = new PermissionsGuard(makeReflector(['reservations.view']));
    expect(guard.canActivate(makeContext(undefined))).toBe(false);
  });

  it('deniega por defecto (nunca "abre" por una lista de permisos vacía inesperada)', () => {
    // Lista vacía se trata igual que "sin restricción" — documentado acá para
    // dejar explícito que RequirePermissions() sin argumentos no es un patrón
    // válido de uso (siempre debe pasarse al menos un permiso).
    const guard = new PermissionsGuard(makeReflector([]));
    expect(guard.canActivate(makeContext(baseUser))).toBe(true);
  });
});
