-- HVAC AI CSR database schema
-- Run this file once in the Neon SQL Editor.
-- All business records are scoped to a company (tenant).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One employee may hold multiple roles (for example, Dispatcher + Technician).
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  roles TEXT[] NOT NULL DEFAULT ARRAY['technician']::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  google_calendar_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, email),
  CONSTRAINT employees_roles_valid CHECK (
    roles <@ ARRAY['owner', 'dispatcher', 'technician']::TEXT[]
    AND cardinality(roles) > 0
  )
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, phone)
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'USA',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  access_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'livekit',
  provider_call_id TEXT,
  caller_phone TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound',
  status TEXT NOT NULL DEFAULT 'completed',
  outcome TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  summary TEXT,
  transcript TEXT,
  recording_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT calls_direction_valid CHECK (direction IN ('inbound', 'outbound')),
  CONSTRAINT calls_status_valid CHECK (status IN ('queued', 'ringing', 'in_progress', 'completed', 'missed', 'failed')),
  CONSTRAINT calls_duration_nonnegative CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  UNIQUE (company_id, provider, provider_call_id)
);

CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_address_id UUID REFERENCES customer_addresses(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  request_number BIGINT GENERATED ALWAYS AS IDENTITY,
  category TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  source TEXT NOT NULL DEFAULT 'ai_call',
  preferred_time_notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_requests_category_valid CHECK (
    category IN ('repair', 'maintenance_tune_up', 'new_system_estimate', 'warranty_callback')
  ),
  CONSTRAINT service_requests_priority_valid CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT service_requests_status_valid CHECK (status IN ('open', 'in_progress', 'resolved', 'cancelled')),
  CONSTRAINT service_requests_source_valid CHECK (source IN ('ai_call', 'phone_call', 'website', 'manual', 'sms'))
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_address_id UUID REFERENCES customer_addresses(id) ON DELETE SET NULL,
  service_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  service_description TEXT NOT NULL,
  requested_start_at TIMESTAMPTZ,
  requested_end_at TIMESTAMPTZ,
  scheduled_start_at TIMESTAMPTZ,
  scheduled_end_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'ai_receptionist',
  owner_notes TEXT,
  approved_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  calendar_booking_status TEXT NOT NULL DEFAULT 'not_started',
  calendar_event_id TEXT,
  calendar_error TEXT,
  customer_confirmation_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT appointments_status_valid CHECK (
    status IN ('pending_approval', 'approved_pending_calendar', 'confirmed', 'rejected', 'cancelled', 'completed')
  ),
  CONSTRAINT appointments_calendar_status_valid CHECK (
    calendar_booking_status IN ('not_started', 'pending', 'booked', 'failed', 'cancelled')
  ),
  CONSTRAINT appointments_source_valid CHECK (source IN ('ai_receptionist', 'phone_call', 'website', 'manual')),
  CONSTRAINT appointments_requested_window_valid CHECK (
    requested_end_at IS NULL OR requested_start_at IS NULL OR requested_end_at > requested_start_at
  ),
  CONSTRAINT appointments_scheduled_window_valid CHECK (
    scheduled_end_at IS NULL OR scheduled_start_at IS NULL OR scheduled_end_at > scheduled_start_at
  ),
  CONSTRAINT appointments_confirmation_guard CHECK (
    status <> 'confirmed' OR (
      assigned_employee_id IS NOT NULL
      AND approved_at IS NOT NULL
      AND calendar_booking_status = 'booked'
      AND calendar_event_id IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_phone ON customers(company_id, phone);
CREATE INDEX IF NOT EXISTS idx_addresses_customer ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_calls_company_started ON calls(company_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_customer ON calls(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_company_status ON service_requests(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_company_status ON appointments(company_id, status, requested_start_at);
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_employee ON appointments(assigned_employee_id, scheduled_start_at);

-- Keep updated_at current when a row is changed.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS companies_set_updated_at ON companies;
CREATE TRIGGER companies_set_updated_at BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS employees_set_updated_at ON employees;
CREATE TRIGGER employees_set_updated_at BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS customers_set_updated_at ON customers;
CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS service_requests_set_updated_at ON service_requests;
CREATE TRIGGER service_requests_set_updated_at BEFORE UPDATE ON service_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS appointments_set_updated_at ON appointments;
CREATE TRIGGER appointments_set_updated_at BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
