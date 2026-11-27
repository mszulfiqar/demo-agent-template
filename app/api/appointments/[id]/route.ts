import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, technicians, customerAddresses } from "@/lib/db/schema";
import { checkTechnicianAvailability } from "@/lib/scheduling";
import { inngest } from "@/inngest/client";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

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

    const technicianId = typeof body.technicianId === "string" ? body.technicianId : "";
    if (!technicianId) return NextResponse.json({ error: "Select a technician first." }, { status: 400 });
    const [technician] = await db.select().from(technicians).where(eq(technicians.id, technicianId)).limit(1);
    if (!technician || !technician.isActive) return NextResponse.json({ error: "Select an active technician." }, { status: 400 });

    if (action === "assign") {
      if (["confirmed", "completed", "rejected", "cancelled"].includes(current.status)) return NextResponse.json({ error: "This appointment can no longer be reassigned." }, { status: 409 });
      const start = current.scheduledStartAt ?? current.requestedStartAt;
      const end = current.scheduledEndAt ?? current.requestedEndAt;
      if (start && end) {
        const [address] = current.customerAddressId ? await db.select().from(customerAddresses).where(eq(customerAddresses.id, current.customerAddressId)).limit(1) : [null];
        const requiredSkill = ["repair", "maintenance", "installation"].includes(current.appointmentType) ? current.appointmentType : null;
        const check = await checkTechnicianAvailability(technicianId, start, end, id, current.appointmentType === "emergency", { postalCode: address?.postalCode, requiredSkill });
        if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 409 });
      }
      const [updated] = await db.update(appointments).set({ assignedTechnicianId: technicianId, updatedAt: new Date() }).where(eq(appointments.id, id)).returning();
      return NextResponse.json({ appointment: updated });
    }

    if (action === "approve") {
      if (current.status !== "pending_approval" && current.status !== "pending_calendar") {
        return NextResponse.json({ error: "Only requests awaiting approval or calendar processing can be approved." }, { status: 409 });
      }
      const start = current.scheduledStartAt ?? current.requestedStartAt;
      const end = current.scheduledEndAt ?? current.requestedEndAt;
      if (!start || !end) return NextResponse.json({ error: "Add an appointment date and time before approval." }, { status: 409 });
      const [address] = current.customerAddressId ? await db.select().from(customerAddresses).where(eq(customerAddresses.id, current.customerAddressId)).limit(1) : [null];
      const requiredSkill = ["repair", "maintenance", "installation"].includes(current.appointmentType) ? current.appointmentType : null;
      const check = await checkTechnicianAvailability(technicianId, start, end, id, current.appointmentType === "emergency", { postalCode: address?.postalCode, requiredSkill });
      if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 409 });
      const [updated] = current.status === "pending_approval"
        ? await db.update(appointments).set({
            assignedTechnicianId: technicianId,
            status: "pending_calendar",
            calendarStatus: "pending",
            approvedAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(appointments.id, id)).returning()
        : [current];

      await inngest.send({
        id: "appointment-approved-" + id,
        name: "hvac/appointment.approved",
        data: {
          appointmentId: updated.id,
          technicianId: updated.assignedTechnicianId,
          requestedStartAt: updated.requestedStartAt?.toISOString() ?? null,
          requestedEndAt: updated.requestedEndAt?.toISOString() ?? null,
        },
      });

      return NextResponse.json({
        appointment: updated,
        message: "Owner approval saved and background workflow triggered. Appointment remains unconfirmed until Google Calendar booking succeeds.",
      });
    }

    return NextResponse.json({ error: "Unsupported appointment action." }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/appointments/[id] failed:", error);
    return NextResponse.json({ error: "Unable to update appointment." }, { status: 500 });
  }
}
