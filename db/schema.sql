-- HVAC AI CSR database schema
-- PostgreSQL / Neon. Run this entire file in the Neon SQL Editor.
-- All business records are tenant-scoped by company_id.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE employee_role AS ENUM ('owner', 'dispatcher', 'technician');
CREATE TYPE service_request_category AS ENUM (
  'repair',
  'maintenance_tune_up',
  'new_system_estimate',
  'warranty_callback'
);
CREATE TYPE service_request_status AS ENUM ('open', 'in_progress', 'resolved', 'cancelled');
CREATE TYPE request_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE call_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE call_status AS ENUM ('queued', 'ringing', 'in_progress', 'completed', 'missed', 'failed');
CREATE TYPE call_outcome AS ENUM (
  'appointment_requested',
  'service_request_created',
  'estimate_inquiry',
  'transferred',
  'message_taken',
  'missed',
  'spam',
  'other'
);
CREATE TYPE appointment_status AS ENUM (
  'pending_approval',
  'pending_calendar',
  'confirmed',
  'rejected',
  'cancelled',
  'completed'
);
CREATE TYPE calendar_booking_status AS ENUM ('not_started', 'pending', 'booked', 'failed', 'cancelled');

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  business_phone TEXT,
  business_email TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  auth_user_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, email),
  UNIQUE (auth_user_id)
);

CREATE TABLE employee_roles (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role employee_role NOT NULL,
  PRIMARY KEY (employee_id, role)
);

CREATE INDEX employees_company_idx ON employees(company_id);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, phone)
);

CREATE INDEX customers_company_name_idx ON customers(company_id, last_name, first_name);

CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Primary',
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX customer_addresses_customer_idx ON customer_addresses(company_id, customer_id);

CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  livekit_room_name TEXT,
  livekit_participant_identity TEXT,
  provider_call_id TEXT,
  direction call_direction NOT NULL DEFAULT 'inbound',
  status call_status NOT NULL DEFAULT 'queued',
  outcome call_outcome,
  from_phone TEXT,
  to_phone TEXT,
  started_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  transcript TEXT,
  summary TEXT,
  recording_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, provider_call_id)
);

CREATE INDEX calls_company_created_idx ON calls(company_id, created_at DESC);
CREATE INDEX calls_customer_idx ON calls(company_id, customer_id);

CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_address_id UUID REFERENCES customer_addresses(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  category service_request_category NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority request_priority NOT NULL DEFAULT 'normal',
  status service_request_status NOT NULL DEFAULT 'open',
  source TEXT NOT NULL DEFAULT 'ai_call',
  created_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX service_requests_company_status_idx ON service_requests(company_id, status, created_at DESC);
CREATE INDEX service_requests_customer_idx ON service_requests(company_id, customer_id);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_address_id UUID REFERENCES customer_addresses(id) ON DELETE SET NULL,
  service_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  assigned_technician_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  requested_start_at TIMESTAMPTZ,
  requested_end_at TIMESTAMPTZ,
  scheduled_start_at TIMESTAMPTZ,
  scheduled_end_at TIMESTAMPTZ,
  status appointment_status NOT NULL DEFAULT 'pending_approval',
  calendar_status calendar_booking_status NOT NULL DEFAULT 'not_started',
  calendar_event_id TEXT,
  calendar_provider TEXT,
  approved_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  customer_confirmation_sent_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'ai_receptionist',
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (requested_end_at IS NULL OR requested_start_at IS NULL OR requested_end_at > requested_start_at),
  CHECK (scheduled_end_at IS NULL OR scheduled_start_at IS NULL OR scheduled_end_at > scheduled_start_at),
  CHECK (
    status <> 'confirmed'
    OR (calendar_status = 'booked' AND calendar_event_id IS NOT NULL AND assigned_technician_id IS NOT NULL)
  )
);

CREATE INDEX appointments_company_status_date_idx ON appointments(company_id, status, scheduled_start_at);
CREATE INDEX appointments_technician_date_idx ON appointments(company_id, assigned_technician_id, scheduled_start_at);
CREATE INDEX appointments_customer_idx ON appointments(company_id, customer_id);

CREATE TABLE call_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX call_events_call_idx ON call_events(company_id, call_id, created_at);

-- Keep updated_at current on mutable business tables.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_set_updated_at BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER employees_set_updated_at BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER service_requests_set_updated_at BEFORE UPDATE ON service_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER appointments_set_updated_at BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create one demo HVAC company. Safe to re-run.
INSERT INTO companies (name, slug, timezone)
VALUES ('Demo HVAC Services', 'demo-hvac-services', 'America/Chicago')
ON CONFLICT (slug) DO NOTHING;
