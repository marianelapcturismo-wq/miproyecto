# Hotel PMS — Sistema integral de gestión hotelera

Sistema de gestión hotelera (PMS) multi-tenant: operación diaria (reservas,
check-in/out, housekeeping), administración (tarifas, pagos, caja) y gestión
(dashboard, KPIs, reportes) para un hotel pequeño o mediano, con arquitectura
preparada para escalar a múltiples hoteles.

Ver `docs/01-analisis-arquitectura.md` para el análisis funcional completo,
las decisiones de arquitectura y el alcance de cada etapa.

## Estado actual: MVP (Etapa 3)

Implementado y probado end-to-end:

- Login con JWT (access + refresh) y permisos por rol configurables en base de datos
- Dashboard operativo (ocupación, check-ins/outs de hoy, pagos pendientes, alertas)
- Tipos de habitación y habitaciones (con estados: disponible, ocupada, limpieza, mantenimiento, fuera de servicio)
- Huéspedes (ficha, búsqueda, historial de reservas)
- Reservas: creación con verificación de disponibilidad, edición, cancelación
- Calendario visual (habitaciones × fechas) con creación de reservas por click
- Check-in / check-out con actualización automática del estado de la habitación
- Pagos básicos (seña, parcial, final, devolución) y saldo de cuenta por reserva
- Auditoría de acciones relevantes (`AuditLog`)
- Datos de prueba realistas (seed) para poder probar todo el flujo

## Stack

- **Backend**: NestJS + TypeScript, Prisma ORM, PostgreSQL, JWT (passport-jwt)
- **Frontend**: React + TypeScript, Vite, TailwindCSS, TanStack Query, React Router
- **Base de datos**: PostgreSQL, multi-tenant (`hotelId` en cada tabla de negocio), constraint a nivel de base de datos que impide reservas superpuestas por habitación

## Requisitos

- Node.js 20+
- PostgreSQL 14+ (con extensión `btree_gist`)

## Cómo correrlo

```bash
# 1. Instalar dependencias (workspaces: root, apps/api, apps/web)
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar DATABASE_URL si tu Postgres no corre en localhost:5432

# 3. Migrar la base de datos y cargar datos de prueba
npm run prisma:migrate
npm run prisma:seed

# 4. Levantar backend y frontend (en dos terminales)
npm run dev:api      # http://localhost:3001/api
npm run dev:web       # http://localhost:5173
```

### Usuarios de prueba (password: `Demo1234!`)

| Email | Rol |
|---|---|
| admin@hotellosalerces.com | Administrador |
| gerente@hotellosalerces.com | Gerente |
| recepcion@hotellosalerces.com | Recepción |
| housekeeping@hotellosalerces.com | Housekeeping |
| mantenimiento@hotellosalerces.com | Mantenimiento |

## Estructura del repositorio

```
/apps
  /api        NestJS — API REST (/api/*)
  /web        React + Vite — frontend
/prisma       schema.prisma, migraciones, seed de datos de prueba
/docs         análisis funcional y decisiones de arquitectura
```

## Decisiones y simplificaciones tomadas en el MVP

Documentadas en detalle en `docs/01-analisis-arquitectura.md`. Las más relevantes:

- **Multi-tenant desde el día 1**: todas las tablas de negocio tienen `hotelId`, aunque hoy operamos un solo hotel.
- **No superposición de reservas garantizada en base de datos** (constraint `EXCLUDE` de Postgres), no solo validada en el backend.
- **Auditoría explícita**: cada acción relevante (crear/editar/cancelar reserva, pago, check-in/out) se registra con un antes/después, no un log genérico de requests.
- **Refresh token sin revocación server-side** (stateless): simplificación aceptable para el MVP; si se necesita poder invalidar sesiones activamente, es un endurecimiento a agregar antes de producción.
- **Aislamiento por `hotelId` a nivel de aplicación**, no Row-Level Security de Postgres: suficiente para el MVP; RLS es candidato a sumarse cuando el sistema pase a multi-hotel comercial real.
- **Calendario con creación por click + edición vía formulario**, sin arrastrar-y-soltar reservas todavía (queda como mejora de UX de una próxima etapa).

## Próximos pasos (Etapa 4 en adelante)

Consumos y servicios adicionales, caja diaria con cierre, gestión de tarifas por temporada/plan avanzada, canales de venta con comisión, housekeeping y mantenimiento como módulos propios, y luego el dashboard gerencial / BI (ocupación, ADR, RevPAR, forecast, objetivos, alertas) descripto en el análisis.
