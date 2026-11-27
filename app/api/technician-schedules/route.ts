import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { technicians, technicianWeeklySchedules } from "@/lib/db/schema";

export const runtime = "nodejs";

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const validTime = (value: unknown): value is string => typeof value === "string" && timePattern.test(value);
const nullableTime = (value: unknown): string | null => value === "" || value == null ? null : validTime(value) ? value : null;

export async function GET() {
  try {
    const [techs, schedules] = await Promise.all([
      db.select({ id: technicians.id, fullName: technicians.fullName, isActive: technicians.isActive }).from(technicians).orderBy(asc(technicians.fullName)),
      db.select().from(technicianWeeklySchedules).orderBy(asc(technicianWeeklySchedules.dayOfWeek)),
    ]);
    return NextResponse.json({ technicians: techs, schedules });
  } catch (error) {
    console.error("GET /api/technician-schedules failed:", error);
    return NextResponse.json({ error: "Unable to load technician schedules." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const technicianId = typeof body.technicianId === "string" ? body.technicianId : "";
    const days = Array.isArray(body.days) ? body.days : [];
    if (!technicianId || days.length !== 7) {
      return NextResponse.json({ error: "A technician and all seven days are required." }, { status: 400 });
    }
    const [technician] = await db.select({ id: technicians.id }).from(technicians).where(eq(technicians.id, technicianId)).limit(1);
    if (!technician) return NextResponse.json({ error: "Technician not found." }, { status: 404 });

    const seen = new Set<number>();
    const values = [];
    for (const day of days) {
      const dayOfWeek = Number(day.dayOfWeek);
      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || seen.has(dayOfWeek)) {
        return NextResponse.json({ error: "Each weekday must appear exactly once." }, { status: 400 });
      }
      seen.add(dayOfWeek);
      const isWorking = day.isWorking === true;
      const isOnCall = day.isOnCall === true;
      const startTime = nullableTime(day.startTime);
      const endTime = nullableTime(day.endTime);
      const breakStartTime = nullableTime(day.breakStartTime);
      const breakEndTime = nullableTime(day.breakEndTime);
      const onCallStartTime = nullableTime(day.onCallStartTime);
      const onCallEndTime = nullableTime(day.onCallEndTime);
      if ((isWorking && (!startTime || !endTime || startTime >= endTime)) ||
          ((breakStartTime && !breakEndTime) || (!breakStartTime && breakEndTime)) ||
          (breakStartTime && (breakStartTime <= startTime! || breakEndTime! >= endTime! || breakStartTime >= breakEndTime!)) ||
          (isOnCall && (!onCallStartTime || !onCallEndTime || onCallStartTime >= onCallEndTime))) {
        return NextResponse.json({ error: "Check working hours, break times, and on-call hours. End times must be later than start times." }, { status: 400 });
      }
      if ([day.startTime, day.endTime, day.breakStartTime, day.breakEndTime, day.onCallStartTime, day.onCallEndTime].some(v => v != null && v !== "" && !validTime(v))) {
        return NextResponse.json({ error: "Times must use 24-hour HH:MM format." }, { status: 400 });
      }
      values.push({
        technicianId, dayOfWeek, isWorking,
        startTime: isWorking ? startTime : null,
        endTime: isWorking ? endTime : null,
        breakStartTime: isWorking ? breakStartTime : null,
        breakEndTime: isWorking ? breakEndTime : null,
        isOnCall,
        onCallStartTime: isOnCall ? onCallStartTime : null,
        onCallEndTime: isOnCall ? onCallEndTime : null,
      });
    }
    if (seen.size !== 7) return NextResponse.json({ error: "All seven days are required." }, { status: 400 });

    for (const value of values) {
      await db.insert(technicianWeeklySchedules).values(value).onConflictDoUpdate({
        target: [technicianWeeklySchedules.technicianId, technicianWeeklySchedules.dayOfWeek],
        set: {
          isWorking: value.isWorking, startTime: value.startTime, endTime: value.endTime,
          breakStartTime: value.breakStartTime, breakEndTime: value.breakEndTime,
          isOnCall: value.isOnCall, onCallStartTime: value.onCallStartTime, onCallEndTime: value.onCallEndTime,
          updatedAt: new Date(),
        },
      });
    }
    const saved = await db.select().from(technicianWeeklySchedules).where(eq(technicianWeeklySchedules.technicianId, technicianId)).orderBy(asc(technicianWeeklySchedules.dayOfWeek));
    return NextResponse.json({ schedules: saved });
  } catch (error) {
    console.error("PUT /api/technician-schedules failed:", error);
    return NextResponse.json({ error: "Unable to save technician schedule." }, { status: 500 });
  }
}
