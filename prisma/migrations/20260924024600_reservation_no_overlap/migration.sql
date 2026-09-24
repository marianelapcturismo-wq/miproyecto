-- Evita reservas superpuestas para la misma habitación a nivel de base de datos.
-- Requiere btree_gist (ya habilitada al crear la base).
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Reservation"
ADD CONSTRAINT reservation_no_overlap
EXCLUDE USING gist (
  "roomId" WITH =,
  daterange("checkInDate", "checkOutDate", '[)') WITH &&
) WHERE (status NOT IN ('CANCELADA', 'NO_SHOW'));
