import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
  unique,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const employeeRoleEnum = pgEnum("employee_role", ["owner", "dispatcher", "technician"]);
export const serviceRequestCategoryEnum = pgEnum("service_request_category", [
  "repair", "maintenance_tune_up", "new_system_estimate", "warranty_callback",
]);
export const serviceRequestStatusEnum = pgEnum("service_request_status", [
  "open", "in_progress", "resolved", "cancelled",
]);
export const requestPriorityEnum = pgEnum("request_priority", ["low", "normal", "high", "urgent"]);
export const callDirectionEnum = pgEnum("call_direction", ["inbound", "outbound"]);
export const callStatusEnum = pgEnum("call_status", [
  "queued", "ringing", "in_progress", "completed", "missed", "failed",
]);
export const callOutcomeEnum = pgEnum("call_outcome", [
  "appointment_requested", "service_request_created", "estimate_inquiry",
  "transferred", "message_taken", "missed", "spam", "other",
]);
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending_approval", "pending_calendar", "confirmed", "rejected", "cancelled", "completed",
]);
export const calendarBookingStatusEnum = pgEnum("calendar_booking_status", [
  "not_started", "pending", "booked", "failed", "cancelled",
]);

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  businessPhone: text("business_phone"),
  businessEmail: text("business_email"),
  timezone: text("timezone").notNull().default("America/Chicago"),
  ...timestamps,
});

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  authUserId: text("auth_user_id").unique(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
}, (table) => [
  unique("employees_company_email_unique").on(table.companyId, table.email),
  index("employees_company_idx").on(table.companyId),
]);

export const employeeRoles = pgTable("employee_roles", {
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  role: employeeRoleEnum("role").notNull(),
}, (table) => [
  unique("employee_roles_pk").on(table.employeeId, table.role),
]);

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  notes: text("notes"),
  ...timestamps,
}, (table) => [
  unique("customers_company_phone_unique").on(table.companyId, table.phone),
  index("customers_company_name_idx").on(table.companyId, table.lastName, table.firstName),
]);

export const customerAddresses = pgTable("customer_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  label: text("label").notNull().default("Primary"),
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  city: text("city").notNull(),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country").notNull().default("US"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("customer_addresses_customer_idx").on(table.companyId, table.customerId),
]);

export const calls = pgTable("calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  livekitRoomName: text("livekit_room_name"),
  livekitParticipantIdentity: text("livekit_participant_identity"),
  providerCallId: text("provider_call_id"),
  direction: callDirectionEnum("direction").notNull().default("inbound"),
  status: callStatusEnum("status").notNull().default("queued"),
  outcome: callOutcomeEnum("outcome"),
  fromPhone: text("from_phone"),
  toPhone: text("to_phone"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
  transcript: text("transcript"),
  summary: text("summary"),
  recordingUrl: text("recording_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("calls_company_provider_call_unique").on(table.companyId, table.providerCallId),
  index("calls_company_created_idx").on(table.companyId, table.createdAt),
  index("calls_customer_idx").on(table.companyId, table.customerId),
  check("calls_duration_nonnegative", sql`${table.durationSeconds} IS NULL OR ${table.durationSeconds} >= 0`),
]);

export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
  customerAddressId: uuid("customer_address_id").references(() => customerAddresses.id, { onDelete: "set null" }),
  callId: uuid("call_id").references(() => calls.id, { onDelete: "set null" }),
  category: serviceRequestCategoryEnum("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: requestPriorityEnum("priority").notNull().default("normal"),
  status: serviceRequestStatusEnum("status").notNull().default("open"),
  source: text("source").notNull().default("ai_call"),
  createdByEmployeeId: uuid("created_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  ...timestamps,
}, (table) => [
  index("service_requests_company_status_idx").on(table.companyId, table.status, table.createdAt),
  index("service_requests_customer_idx").on(table.companyId, table.customerId),
]);

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
  customerAddressId: uuid("customer_address_id").references(() => customerAddresses.id, { onDelete: "set null" }),
  serviceRequestId: uuid("service_request_id").references(() => serviceRequests.id, { onDelete: "set null" }),
  callId: uuid("call_id").references(() => calls.id, { onDelete: "set null" }),
  assignedTechnicianId: uuid("assigned_technician_id").references(() => employees.id, { onDelete: "set null" }),
  requestedStartAt: timestamp("requested_start_at", { withTimezone: true }),
  requestedEndAt: timestamp("requested_end_at", { withTimezone: true }),
  scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }),
  scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }),
  status: appointmentStatusEnum("status").notNull().default("pending_approval"),
  calendarStatus: calendarBookingStatusEnum("calendar_status").notNull().default("not_started"),
  calendarEventId: text("calendar_event_id"),
  calendarProvider: text("calendar_provider"),
  approvedByEmployeeId: uuid("approved_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedByEmployeeId: uuid("rejected_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  customerConfirmationSentAt: timestamp("customer_confirmation_sent_at", { withTimezone: true }),
  source: text("source").notNull().default("ai_receptionist"),
  internalNotes: text("internal_notes"),
  ...timestamps,
}, (table) => [
  index("appointments_company_status_date_idx").on(table.companyId, table.status, table.scheduledStartAt),
  index("appointments_technician_date_idx").on(table.companyId, table.assignedTechnicianId, table.scheduledStartAt),
  index("appointments_customer_idx").on(table.companyId, table.customerId),
  check("appointments_requested_range_valid", sql`${table.requestedEndAt} IS NULL OR ${table.requestedStartAt} IS NULL OR ${table.requestedEndAt} > ${table.requestedStartAt}`),
  check("appointments_scheduled_range_valid", sql`${table.scheduledEndAt} IS NULL OR ${table.scheduledStartAt} IS NULL OR ${table.scheduledEndAt} > ${table.scheduledStartAt}`),
  check("appointments_confirmed_requires_calendar_booking", sql`${table.status} <> 'confirmed' OR (${table.calendarStatus} = 'booked' AND ${table.calendarEventId} IS NOT NULL AND ${table.assignedTechnicianId} IS NOT NULL)`),
]);

export const callEvents = pgTable("call_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  callId: uuid("call_id").notNull().references(() => calls.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  details: jsonb("details").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("call_events_call_idx").on(table.companyId, table.callId, table.createdAt),
]);
