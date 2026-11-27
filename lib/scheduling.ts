import { and, eq, lt, ne, or, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, technicianScheduleExceptions, technicianWeeklySchedules, technicianSkills, technicianServiceZipCodes } from "@/lib/db/schema";

const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.BUSINESS_TIME_ZONE || "UTC",
    weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return { day: dayMap[values.weekday], time: `${values.hour}:${values.minute}` };
}
export async function checkTechnicianAvailability(technicianId: string, start: Date, end: Date, appointmentId?: string, emergency = false, context?: { postalCode?: string | null; requiredSkill?: string | null }) {
  if (!(start instanceof Date) || !(end instanceof Date) || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    return { ok: false, reason: "Choose a valid appointment start and end time." };
  }
  const [exceptionRows, dayRows, skills, zipCodes] = await Promise.all([
    db.select().from(technicianScheduleExceptions).where(and(eq(technicianScheduleExceptions.technicianId, technicianId), lt(technicianScheduleExceptions.startAt, end), gt(technicianScheduleExceptions.endAt, start))),
    db.select().from(technicianWeeklySchedules).where(eq(technicianWeeklySchedules.technicianId, technicianId)),
    db.select().from(technicianSkills).where(eq(technicianSkills.technicianId, technicianId)),
    db.select().from(technicianServiceZipCodes).where(eq(technicianServiceZipCodes.technicianId, technicianId)),
  ]);
  const startLocal = localParts(start);
  const endLocal = localParts(new Date(end.getTime() - 60000));
  const overlappingException = exceptionRows.find(row => row.startAt < end && row.endAt > start);
  const exception = exceptionRows.find(row => row.startAt <= start && row.endAt >= end);
  if (overlappingException && !exception) return { ok: false, reason: "Appointment overlaps a schedule exception. Adjust the time or exception." };
  if (exception) {
    if (!exception.isAvailable) return { ok: false, reason: exception.exceptionType === "holiday" ? "Technician is marked unavailable for this date." : "Technician has time off during this appointment." };
    if (emergency && !exception.isOnCall) return { ok: false, reason: "This exception does not include on-call coverage." };
  } else {
    if (startLocal.day !== endLocal.day) return { ok: false, reason: "Appointments crossing local midnight need a custom shift exception." };
    const schedule = dayRows.find(row => row.dayOfWeek === startLocal.day);
    if (!schedule) return { ok: false, reason: "No weekly schedule is configured for this technician on that day." };
    const regular = schedule.isWorking && !!schedule.startTime && !!schedule.endTime && startLocal.time >= schedule.startTime && endLocal.time < schedule.endTime;
    const onCall = emergency && schedule.isOnCall && !!schedule.onCallStartTime && !!schedule.onCallEndTime && startLocal.time >= schedule.onCallStartTime && endLocal.time < schedule.onCallEndTime;
    if (!regular && !onCall) return { ok: false, reason: emergency ? "Technician is outside working hours and is not on call." : "Appointment is outside this technician's working hours." };
    if (regular && schedule.breakStartTime && schedule.breakEndTime && startLocal.time < schedule.breakEndTime && endLocal.time >= schedule.breakStartTime) {
      return { ok: false, reason: "Appointment overlaps the technician's scheduled break." };
    }
  }
  if (context?.requiredSkill && skills.length) {
    const required = context.requiredSkill.toLowerCase();
    if (!skills.some(row => row.skill.toLowerCase().includes(required))) return { ok: false, reason: "Technician does not have the required skill: " + context.requiredSkill + "." };
  }
  if (context?.postalCode && zipCodes.length && !zipCodes.some(row => row.postalCode.toLowerCase() === context.postalCode!.toLowerCase())) return { ok: false, reason: "Technician does not cover the customer service ZIP code." };
  const conflicts = await db.select({ id: appointments.id }).from(appointments).where(and(
    eq(appointments.assignedTechnicianId, technicianId),
    or(eq(appointments.status, "pending_approval"), eq(appointments.status, "pending_calendar"), eq(appointments.status, "confirmed")),
    lt(appointments.scheduledStartAt, end),
    gt(appointments.scheduledEndAt, start),
    appointmentId ? ne(appointments.id, appointmentId) : undefined,
  )).limit(1);
  if (conflicts.length) return { ok: false, reason: "Technician already has an overlapping appointment." };
  return { ok: true, reason: null };
}
