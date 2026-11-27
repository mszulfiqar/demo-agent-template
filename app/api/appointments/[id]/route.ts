import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, technicians, customerAddresses } from "@/lib/db/schema";
import { checkTechnicianAvailability } from "@/lib/scheduling";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const allowedTypes = ["repair", "maintenance", "installation", "estimate", "emergency", "other"];

async function checkAssignment(technicianId: string, appointmentId: string, start: Date, end: Date, appointmentType: string, addressId: string | null, overrideWarnings: boolean) {
  const [technician] = await db.select().from(technicians).where(eq(technicians.id, technicianId)).limit(1);
  if (!technician || !technician.isActive) return { response: NextResponse.json({ error: "Select an active technician." }, { status: 400 }) };
  const [address] = addressId ? await db.select().from(customerAddresses).where(eq(customerAddresses.id, addressId)).limit(1) : [null];
  const requiredSkill = ["repair", "maintenance", "installation"].includes(appointmentType) ? appointmentType : null;
  const check = await checkTechnicianAvailability(technicianId, start, end, appointmentId, appointmentType === "emergency", { postalCode: address?.postalCode, requiredSkill });
  if (!check.ok) return { response: NextResponse.json({ error: check.reason }, { status: 409 }) };
  if (check.warnings.length && !overrideWarnings) return { response: NextResponse.json({ warnings: check.warnings, requiresOverride: true }, { status: 409 }) };
  return { technician };
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action;
    const [current] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    if (!current) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });

    if (action === "reject") {
      if (current.status !== "pending_approval") return NextResponse.json({ error: "Only requests awaiting approval can be rejected." }, { status: 409 });
      const [updated] = await db.update(appointments).set({ status: "rejected", rejectedAt: new Date(), updatedAt: new Date() }).where(eq(appointments.id, id)).returning();
      return NextResponse.json({ appointment: updated });
    }

    if (action === "cancel") {
      if (!["pending_approval", "pending_calendar", "confirmed"].includes(current.status)) return NextResponse.json({ error: "Only open or confirmed appointments can be cancelled." }, { status: 409 });
      const [updated] = await db.update(appointments).set({ status: "cancelled", calendarStatus: "cancelled", updatedAt: new Date() }).where(eq(appointments.id, id)).returning();
      return NextResponse.json({ appointment: updated, message: "Appointment cancelled." });
    }

    if (action === "complete") {
      if (current.status !== "confirmed") return NextResponse.json({ error: "Only confirmed appointments can be marked completed." }, { status: 409 });
      const [updated] = await db.update(appointments).set({ status: "completed", updatedAt: new Date() }).where(eq(appointments.id, id)).returning();
      return NextResponse.json({ appointment: updated, message: "Appointment marked completed." });
    }

    const technicianId = typeof body.technicianId === "string" ? body.technicianId : "";
    if (!technicianId) return NextResponse.json({ error: "Select a technician first." }, { status: 400 });

    if (action === "assign") {
      if (["confirmed", "completed", "rejected", "cancelled"].includes(current.status)) return NextResponse.json({ error: "This appointment can no longer be reassigned." }, { status: 409 });
      const start = current.scheduledStartAt ?? current.requestedStartAt;
      const end = current.scheduledEndAt ?? current.requestedEndAt;
      if (start && end) {
        const checked = await checkAssignment(technicianId, id, start, end, current.appointmentType, current.customerAddressId, body.overrideWarnings === true);
        if ("response" in checked) return checked.response;
      } else {
        const [technician] = await db.select().from(technicians).where(eq(technicians.id, technicianId)).limit(1);
        if (!technician || !technician.isActive) return NextResponse.json({ error: "Select an active technician." }, { status: 400 });
      }
      const [updated] = await db.update(appointments).set({ assignedTechnicianId: technicianId, updatedAt: new Date() }).where(eq(appointments.id, id)).returning();
      return NextResponse.json({ appointment: updated });
    }

    if (action === "approve") {
      if (current.status !== "pending_approval") return NextResponse.json({ error: "Only requests awaiting owner approval can be approved." }, { status: 409 });
      const start = body.startAt ? new Date(body.startAt) : current.scheduledStartAt ?? current.requestedStartAt;
      const end = body.endAt ? new Date(body.endAt) : current.scheduledEndAt ?? current.requestedEndAt;
      if (!(start instanceof Date) || !(end instanceof Date) || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return NextResponse.json({ error: "Choose a valid appointment start and end time before approval." }, { status: 409 });
      const checked = await checkAssignment(technicianId, id, start, end, current.appointmentType, current.customerAddressId, body.overrideWarnings === true);
      if ("response" in checked) return checked.response;
      const [updated] = await db.update(appointments).set({
        assignedTechnicianId: technicianId, scheduledStartAt: start, scheduledEndAt: end,
        status: "confirmed", calendarStatus: "not_started", approvedAt: new Date(), updatedAt: new Date(),
      }).where(eq(appointments.id, id)).returning();
      return NextResponse.json({ appointment: updated, message: "Appointment approved, scheduled and confirmed in the dispatch calendar." });
    }

    if (action === "edit") {
      if (current.status !== "confirmed") return NextResponse.json({ error: "Only confirmed appointments can be edited from dispatch." }, { status: 409 });
      const start = new Date(body.startAt);
      const end = new Date(body.endAt);
      const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
      const description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) : "";
      const appointmentType = allowedTypes.includes(body.appointmentType) ? body.appointmentType : current.appointmentType;
      if (!title || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
        return NextResponse.json({ error: "Enter a job title and a valid start and end time." }, { status: 400 });
      }
      const checked = await checkAssignment(technicianId, id, start, end, appointmentType, current.customerAddressId, body.overrideWarnings === true);
      if ("response" in checked) return checked.response;
      const [updated] = await db.update(appointments).set({
        assignedTechnicianId: technicianId, scheduledStartAt: start, scheduledEndAt: end,
        requestedStartAt: start, requestedEndAt: end, appointmentType,
        customTitle: title, customDescription: description || null,
        internalNotes: typeof body.internalNotes === "string" ? body.internalNotes.trim().slice(0, 2000) || null : null,
        updatedAt: new Date(),
      }).where(eq(appointments.id, id)).returning();
      return NextResponse.json({ appointment: updated, message: "Appointment updated." });
    }

    return NextResponse.json({ error: "Unsupported appointment action." }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/appointments/[id] failed:", error);
    return NextResponse.json({ error: "Unable to update appointment." }, { status: 500 });
  }
}
