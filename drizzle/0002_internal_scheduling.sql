-- Internal scheduling: confirmed appointments no longer require an external calendar event.
-- Apply this migration to the Neon database before deploying this branch.

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_confirmed_requires_calendar_booking;

-- Legacy requests that were waiting for an external calendar are returned to owner review.
UPDATE appointments
SET status = 'pending_approval', calendar_status = 'not_started'
WHERE status = 'pending_calendar';

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
