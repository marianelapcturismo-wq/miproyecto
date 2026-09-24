# Análisis funcional y arquitectura — Hotel PMS

Resumen de las decisiones tomadas en las Etapas 1 y 2 (análisis y arquitectura),
como referencia para las etapas siguientes. Contexto: hotel en Argentina (ARS,
es-AR), arquitectura multi-tenant desde el día 1 aunque el MVP opera un solo
hotel, sin datos previos a migrar, stack elegido libremente.

## Objetivo

PMS que no solo registra reservas, sino que transforma datos operativos en
información de gestión, en tres capas: **datos** (hechos operativos) →
**indicadores** (ocupación, ADR, RevPAR) → **información para decidir**
(patrones, comparaciones, alertas), sin tomar decisiones de negocio por el
usuario.

## Alcance por etapas

1. **Análisis** (hecho) — objetivo, usuarios, procesos, riesgos, ambigüedades.
2. **Arquitectura** (hecho) — stack, modelo de datos, seguridad, escalabilidad.
3. **MVP** (hecho) — login, dashboard, habitaciones, tipos, huéspedes, reservas, calendario, disponibilidad, check-in/out, pagos básicos.
4. **Operación** (pendiente) — consumos, servicios adicionales, caja, housekeeping, mantenimiento, tarifas avanzadas, canales de venta.
5. **Gestión** (pendiente) — reportes, KPIs (ocupación, ADR, RevPAR), dashboard gerencial, comparaciones, objetivos, alertas, forecast, auditoría avanzada, exportaciones.
6. **Escalabilidad** (pendiente, solo preparar arquitectura) — motor de reservas online, channel manager, WhatsApp/email, facturación electrónica, medios de pago, multi-hotel comercial, multi-moneda, multi-idioma, CRM, app móvil.

## Usuarios y roles

Administrador (todo), Gerente (dashboard/KPIs/reservas/tarifas/caja),
Recepción (reservas/check-in-out/huéspedes/pagos), Housekeeping (estado de
habitaciones/limpieza), Mantenimiento (incidencias/habitaciones). Permisos
configurables en base de datos (`Role` → `Permission` vía `RolePermission`),
no hardcodeados, para que puedan evolucionar sin tocar código.

## Reglas de negocio críticas

- No se permiten reservas superpuestas para la misma habitación — reforzado
  con un `EXCLUDE` constraint en PostgreSQL (`reservation_no_overlap`), no
  solo validado en el backend.
- El saldo de una reserva (`total − pagado`) se calcula en un único lugar
  (`ReservationsService.withBalance`), nunca duplicado en frontend/backend.
- Check-in solo desde `CONFIRMADA`/`PRE_RESERVA`; check-out solo desde
  `CHECK_IN`. El check-out libera la habitación a `LIMPIEZA` automáticamente.
- Criterio fijado para el denominador de ocupación: las habitaciones
  `FUERA_DE_SERVICIO` **no** cuentan como disponibles; el resto de los
  estados físicos sí. Este criterio debe mantenerse consistente en todos los
  KPIs de la Etapa 5.

## Modelo de datos (resumen)

Multi-tenant: toda tabla de negocio lleva `hotelId`. Entidades del MVP:
`Hotel`, `User`, `Role`/`Permission`/`RolePermission`, `Guest`, `RoomType`,
`Room`, `RatePlan`/`Rate`, `Reservation`/`ReservationGuest`, `Payment`,
`AuditLog`. Ver `prisma/schema.prisma` para el detalle completo (tipos,
relaciones, índices).

Precisiones de diseño:
- `RatePlan` (política comercial) separado de `Rate` (precio concreto por
  tipo de habitación/fecha), para que ADR se calcule sobre una base
  consistente cuando se implemente en la Etapa 5.
- `daily_hotel_metrics` (tabla de agregación) **todavía no implementada** —
  es la pieza pendiente para que el dashboard gerencial no recalcule KPIs
  sobre las tablas transaccionales en crudo. Debe construirse en la Etapa 5,
  antes o junto con los primeros reportes de ocupación/ADR/RevPAR.

## Stack técnico

Backend NestJS + TypeScript + Prisma + PostgreSQL (JWT propio, sin proveedor
externo de auth). Frontend React + TypeScript + Vite + TailwindCSS +
TanStack Query + React Router. Monolito modular (no microservicios): dominio
transaccional/relacional, equipo chico. Ver `README.md` para instrucciones
de instalación y ejecución.

## Simplificaciones conscientes del MVP (pendientes de endurecer)

- Refresh token JWT stateless, sin revocación server-side.
- Aislamiento multi-tenant a nivel de aplicación (`hotelId` en cada query),
  no Row-Level Security de PostgreSQL.
- Calendario sin arrastrar-y-soltar (crear por click + editar por formulario).
- Sin gestión de usuarios desde la UI (los usuarios se administran hoy solo
  por seed/base de datos); falta una pantalla de administración de
  usuarios y roles para el Administrador.
- Sin depósito de garantía como concepto distinto de la seña, sin manejo
  explícito de no-show con cobro automático, sin reservas multi-habitación
  (grupales) — quedan para cuando el negocio los necesite.

Ninguna de estas simplificaciones requiere rediseñar el modelo de datos para
resolverse: son features a sumar sobre la base ya construida.
