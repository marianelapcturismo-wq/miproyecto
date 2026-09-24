import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Requiere que el usuario autenticado tenga AL MENOS UNO de los permisos indicados.
 * Los permisos de cada rol se definen en base de datos (Role/Permission/RolePermission)
 * y viajan embebidos en el access token al hacer login.
 */
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
