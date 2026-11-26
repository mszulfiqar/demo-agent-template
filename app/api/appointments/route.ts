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
