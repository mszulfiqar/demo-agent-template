# Northstar HVAC Operations Dashboard

A responsive HVAC AI customer-service operations dashboard for **one HVAC business**, built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, **Drizzle ORM**, and **Neon PostgreSQL**.

## Single-business architecture

This application serves one HVAC business. It is not a multi-tenant SaaS application:
- No companies table or company_id columns.
- Technician profiles, customers, calls, service requests, and appointments belong to this one business.
- Business details are hardcoded in application code; there is no business-settings table.
- Only technician profiles are managed in the dashboard. There is no general employee or role-management system.

## Included screens

- **Overview** — call activity, appointment summary, pending approvals, today's schedule, and recent calls.
- **Customers** — searchable customer directory with contact details and service history.
- **Appointments** — pending appointment requests, technician assignment, and owner approval/rejection workflow.
- **Service requests** — captured repair, maintenance, and estimate inquiries.
- **Call history** — recent answered and missed calls with outcomes and summaries.

## Run locally

Requirements: Node.js 18.18+.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

The database schema is defined in `lib/db/schema.ts`. Generate and apply migrations with:

```bash
npm run db:generate
npm run db:migrate
```

Set `DATABASE_URL` in your local `.env.local` file. Never commit credentials.

## Appointment workflow

1. The AI receptionist captures the customer's details, issue, and preferred appointment window. AI-created requests start as `pending_approval`.
2. The owner reviews the request, selects a technician and time, and approves or rejects it. The system checks working hours, exceptions, skills, service ZIP coverage, and overlapping appointments. A successful approval changes the appointment directly to `confirmed` in the internal dispatch calendar.
3. Appointments created directly by the owner in the dashboard require a customer, technician, start time, and end time. After the same availability checks pass, they are created immediately as `confirmed` without a second approval.
4. The internal dispatch calendar is the scheduling source of truth. Google Calendar is not part of the scheduling workflow. The AI never selects technicians or confirms appointments.

## Current prototype limitations

The dashboard screens still use sample data until their API routes and database queries are implemented. There is currently no authentication, LiveKit integration, Google Calendar integration, or SMS provider integration.

## Background workflows (Inngest)

Inngest runs durable background functions separately from the normal request/response work handled by Next.js. The app exposes its functions at `/api/inngest`.

Currently registered workflows:
- `app/test.background-job` — verifies that the Inngest endpoint can execute a function.


### Local setup

Install dependencies and start the Next.js app:

```bash
npm install
```

For local development with the Inngest Dev Server, add this to `.env.local`:

```env
INNGEST_DEV=1
```

In a second terminal, install and run the Inngest CLI using the official instructions at https://www.inngest.com/docs/getting-started/nextjs-quick-start. Open http://localhost:8288, connect the app endpoint at http://localhost:3000/api/inngest, and invoke the test function from the Dev Server UI.

### Vercel deployment

Connect the Vercel project to Inngest using the official Inngest Vercel integration. It configures the event/signing keys and syncs deployed functions. Do not commit Inngest keys to Git. After deployment, confirm the app is synced and both functions appear in the Inngest dashboard.

Appointment scheduling is handled directly by the application and Neon database. Inngest remains available for future durable background tasks; it is not required to confirm an appointment.
