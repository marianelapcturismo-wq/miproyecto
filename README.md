# Hotel PMS — Sistema integral de gestión hotelera

Sistema de gestión hotelera (PMS) multi-tenant: operación diaria (reservas,
check-in/out, housekeeping), administración (tarifas, pagos, caja) y gestión
(dashboard, KPIs, reportes) para un hotel pequeño o mediano, con arquitectura
preparada para escalar a múltiples hoteles.

Ver `docs/01-analisis-arquitectura.md` para el análisis funcional completo,
las decisiones de arquitectura y el alcance de cada etapa.

## Estado actual: Etapa 5 (Gestión / BI) completa

Implementado y probado end-to-end:

**Etapa 3 — MVP**
- Login con JWT (access + refresh) y permisos por rol configurables en base de datos
- Dashboard operativo (ocupación, check-ins/outs de hoy, pagos pendientes, alertas)
- Tipos de habitación y habitaciones (con estados: disponible, ocupada, limpieza, mantenimiento, fuera de servicio)
- Huéspedes (ficha, búsqueda, historial de reservas)
- Reservas: creación con verificación de disponibilidad, edición, cancelación
- Calendario visual (habitaciones × fechas) con creación de reservas por click
- Check-in / check-out con actualización automática del estado de la habitación
- Pagos básicos (seña, parcial, final, devolución) y saldo de cuenta por reserva
- Auditoría de acciones relevantes (`AuditLog`)

**Etapa 4 — Operación**
- Servicios y consumos: catálogo de servicios adicionales y carga de consumos por reserva, incluidos automáticamente en el saldo de la cuenta
- Caja diaria: apertura, movimientos manuales (ingreso/egreso), cierre con diferencia contra el saldo esperado, e ingresos automáticos al registrar un pago de reserva mientras la caja está abierta
- Housekeeping: tareas de limpieza por habitación con flujo de estados (pendiente → en proceso → limpia → inspeccionada, o con problema), creadas automáticamente al hacer check-out
- Mantenimiento: incidencias por habitación con prioridad y estado, que ponen la habitación en "Mantenimiento" y la liberan a "Disponible" al resolverse
- Tarifas: CRUD completo de planes de tarifa y precios vigentes por tipo de habitación y rango de fechas
- Canales de venta: entidad propia con comisión asociada (reemplaza el campo de texto libre del MVP)

**Etapa 5 — Gestión / BI**
- Tabla de agregación diaria (`DailyHotelMetric`, por hotel/día/tipo de habitación) que calcula ocupación, ADR y RevPAR sin recalcular sobre las tablas transaccionales en cada consulta; los días de hoy/ayer se recalculan siempre, la historia cerrada se cachea y un cron nocturno (`@nestjs/schedule`) la cierra definitivamente
- Dashboard gerencial: ocupación, ADR, RevPAR e ingresos con comparación contra período anterior o mismo período del año anterior (variación absoluta y %), serie diaria graficada, reporte por canal de venta (ingreso bruto/neto según comisión), huéspedes (nuevos vs. recurrentes) y consumos, alertas gerenciales basadas en reglas, exportación a CSV
- Cada KPI muestra su fórmula al pasar el mouse, y la sección de Rentabilidad (GOP/GOPPAR) explica qué datos faltan en vez de inventar un número
- Pronóstico a 7/30/90 días (ocupación proyectada, llegadas, salidas, ingresos previstos, fechas de baja demanda) a partir de reservas confirmadas/pre-reservadas
- Objetivos configurables por período (ocupación, ADR, RevPAR, ingresos, cancelaciones máximas, % venta directa) con progreso real vs. meta
- Pantalla de auditoría con filtro por tipo de entidad

Datos de prueba realistas (seed) para poder probar todo el flujo de punta a punta, incluyendo ~60 días de historial de reservas para que las series y comparaciones de KPIs tengan datos reales.

**Repaso de cierre — seguridad, tests y validación**
- Revisión de seguridad de todo el código: se encontró y corrigió una vulnerabilidad real de aislamiento multi-tenant (`create()`/`update()` de reservas no validaban que habitación/plan de tarifa/canal pertenecieran al hotel del usuario autenticado), con tests de regresión dedicados.
- Se agregó el estado `CONSULTA`/`PRE_RESERVA` con una acción explícita `confirm()` para pasar a `CONFIRMADA` (antes no existía ese camino).
- Tests automatizados en las tres capas: backend (Jest, unitarios + integración contra Postgres real), frontend (Vitest + Testing Library) y un test end-to-end (Playwright) que cubre el flujo crítico completo: login → crear reserva → check-in → pago → check-out.

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

### Cómo correr los tests

```bash
# Backend: tests unitarios (puros) + de integración contra la DB local
cd apps/api && npm test

# Frontend: tests unitarios de componentes/utilidades
cd apps/web && npm test

# End-to-end (Playwright): requiere Postgres + API + frontend corriendo
cd apps/web && npm run test:e2e
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

## Próximos pasos (Etapa 6 en adelante)

Preparar la arquitectura (sin implementar todavía) para: motor de reservas online, channel manager, WhatsApp/email automáticos, facturación electrónica, medios de pago, multi-hotel comercial, multi-moneda, multi-idioma, CRM, app móvil e integraciones externas — descripto en detalle en el análisis. También queda pendiente el informe gerencial mensual automático y la rentabilidad (GOP/GOPPAR), que requiere primero registrar costos operativos.
