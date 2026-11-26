# Northstar HVAC Operations Dashboard

A responsive HVAC AI customer-service operations dashboard prototype built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, and **Lucide**.

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

## Appointment workflow in this prototype

1. The AI receptionist captures the customer's details, issue, and preferred appointment window.
2. A new appointment request starts as `pending_approval`.
3. The owner selects a technician and uses **Simulate approval**.
4. The UI simulates a successful approval/calendar-booking outcome and changes the sample appointment to `confirmed`.

The prototype does **not** create a real Google Calendar event or send a customer SMS. A production integration must only mark an appointment confirmed and notify the customer after the owner has approved it and the calendar booking has succeeded. Calendar booking failures must leave the appointment unconfirmed.

## Demo limitations

All records are seeded sample data. Interactions are local to the browser session and reset on refresh. There is currently:

- No authentication or role management
- No database or API
- No LiveKit integration
- No Google Calendar integration
- No SMS provider integration
- No technician management/settings screens

Technician names are seeded only for the appointment assignment dropdown.
