import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, customers, customerAddresses, technicians, serviceRequests } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await db.select({
      id: appointments.id,
      status: appointments.status,
      appointmentType: appointments.appointmentType,
      customTitle: appointments.customTitle,
      customDescription: appointments.customDescription,
      requestedStartAt: appointments.requestedStartAt,
      requestedEndAt: appointments.requestedEndAt,
      scheduledStartAt: appointments.scheduledStartAt,
      scheduledEndAt: appointments.scheduledEndAt,
      source: appointments.source,
      internalNotes: appointments.internalNotes,
      calendarStatus: appointments.calendarStatus,
      approvedAt: appointments.approvedAt,
      createdAt: appointments.createdAt,
      customerId: customers.id,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      customerPhone: customers.phone,
      serviceTitle: serviceRequests.title,
      technicianId: technicians.id,
      technicianName: technicians.fullName,
      addressLine1: customerAddresses.addressLine1,
      addressLine2: customerAddresses.addressLine2,
      city: customerAddresses.city,
      state: customerAddresses.state,
      postalCode: customerAddresses.postalCode,
    }).from(appointments)
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(customerAddresses, eq(appointments.customerAddressId, customerAddresses.id))
      .leftJoin(serviceRequests, eq(appointments.serviceRequestId, serviceRequests.id))
      .leftJoin(technicians, eq(appointments.assignedTechnicianId, technicians.id))
      .orderBy(desc(appointments.createdAt));
    return NextResponse.json({ appointments: rows });
  } catch (error) {
    console.error("GET /api/appointments failed:", error);
    return NextResponse.json({ error: "Unable to load appointments." }, { status: 500 });
  }
}

const allowedTypes = ["repair", "maintenance", "installation", "estimate", "emergency", "other"];
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customerId = typeof body.customerId === "string" ? body.customerId : "";
    const technicianId = typeof body.technicianId === "string" && body.technicianId ? body.technicianId : null;
    const appointmentType = allowedTypes.includes(body.appointmentType) ? body.appointmentType : "repair";
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) : "";
    const start = new Date(body.startAt);
    const end = new Date(body.endAt);
    if (!customerId || !title || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      return NextResponse.json({ error: "Choose a customer, enter a job title, and provide a valid start and end time." }, { status: 400 });
    }
    const [address] = await db.select().from(customerAddresses).where(eq(customerAddresses.customerId, customerId)).orderBy(desc(customerAddresses.isDefault)).limit(1);
    if (technicianId) {
      const { checkTechnicianAvailability } = await import("@/lib/scheduling");
      const requiredSkill = ["repair", "maintenance", "installation"].includes(appointmentType) ? appointmentType : null;
      const check = await checkTechnicianAvailability(technicianId, start, end, undefined, appointmentType === "emergency", { postalCode: address?.postalCode, requiredSkill });
      if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 409 });
    }
    const [created] = await db.insert(appointments).values({
      customerId, customerAddressId: address?.id ?? null, assignedTechnicianId: technicianId,
      requestedStartAt: start, requestedEndAt: end,
      scheduledStartAt: start, scheduledEndAt: end,
      appointmentType, customTitle: title, customDescription: description || null,
      status: "pending_approval", calendarStatus: "not_started", source: "manual",
      internalNotes: typeof body.internalNotes === "string" ? body.internalNotes.trim().slice(0, 2000) || null : null,
    }).returning();
    return NextResponse.json({ appointment: created, message: "Appointment request created. It remains pending approval and is not confirmed." }, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments failed:", error);
    return NextResponse.json({ error: "Unable to create appointment." }, { status: 500 });
  }
}
