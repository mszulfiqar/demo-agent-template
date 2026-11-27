import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { technicians, technicianScheduleExceptions } from "@/lib/db/schema";

export const runtime = "nodejs";
const allowed = ["time_off", "custom_shift", "holiday", "overtime"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const technicianId = searchParams.get("technicianId");
    const rows = await db.select().from(technicianScheduleExceptions)
      .where(technicianId ? eq(technicianScheduleExceptions.technicianId, technicianId) : undefined)
      .orderBy(asc(technicianScheduleExceptions.startAt));
    return NextResponse.json({ exceptions: rows });
  } catch (error) {
    console.error("GET schedule exceptions:", error);
    return NextResponse.json({ error: "Unable to load schedule exceptions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const technicianId = String(body.technicianId || "");
    const exceptionType = String(body.exceptionType || "");
    const startAt = new Date(body.startAt);
    const endAt = new Date(body.endAt);
    if (!technicianId || !allowed.includes(exceptionType) || !Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) {
      return NextResponse.json({ error: "Choose a technician, exception type, and valid start/end times." }, { status: 400 });
    }
    const [technician] = await db.select({ id: technicians.id }).from(technicians).where(eq(technicians.id, technicianId)).limit(1);
    if (!technician) return NextResponse.json({ error: "Technician not found." }, { status: 404 });
    const [created] = await db.insert(technicianScheduleExceptions).values({
      technicianId, exceptionType, startAt, endAt,
      isAvailable: exceptionType === "custom_shift" || exceptionType === "overtime",
      isOnCall: body.isOnCall === true,
      notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 500) || null : null,
    }).returning();
    return NextResponse.json({ exception: created }, { status: 201 });
  } catch (error) {
    console.error("POST schedule exception:", error);
    return NextResponse.json({ error: "Unable to create schedule exception." }, { status: 500 });
  }
}
