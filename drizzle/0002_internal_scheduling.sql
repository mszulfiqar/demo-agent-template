-- Internal scheduling: confirmed appointments no longer require an external calendar event.
-- Apply this migration to the Neon database before deploying this branch.

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_confirmed_requires_calendar_booking;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_confirmed_requires_assignment
  CHECK (
    status <> 'confirmed'
    OR (
      assigned_technician_id IS NOT NULL
      AND scheduled_start_at IS NOT NULL
      AND scheduled_end_at IS NOT NULL
    )
  );
