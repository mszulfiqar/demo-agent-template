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

export type AvailabilityCheck =
  | { ok: false; reason: string; warnings: string[]; requiresOverride?: false }
  | { ok: true; reason: null; warnings: string[] };

export async function checkTechnicianAvailability(
  technicianId: string,
  start: Date,
  end: Date,
  appointmentId?: string,
  emergency = false,
  context?: { postalCode?: string | null; requiredSkill?: string | null },
): Promise<AvailabilityCheck> {
  if (!(start instanceof Date) || !(end instanceof Date) || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    return { ok: false, reason: "Choose a valid appointment start and end time.", warnings: [] };
  }

  // Real appointment overlaps and approved time off are hard blocks. Breaks and
  // normal working hours are advisory so an owner can make an operational decision.
  const [exceptionRows, dayRows, skills, zipCodes, conflicts] = await Promise.all([
    db.select().from(technicianScheduleExceptions).where(and(
      eq(technicianScheduleExceptions.technicianId, technicianId),
      lt(technicianScheduleExceptions.startAt, end),
      gt(technicianScheduleExceptions.endAt, start),
    )),
    db.select().from(technicianWeeklySchedules).where(eq(technicianWeeklySchedules.technicianId, technicianId)),
    db.select().from(technicianSkills).where(eq(technicianSkills.technicianId, technicianId)),
    db.select().from(technicianServiceZipCodes).where(eq(technicianServiceZipCodes.technicianId, technicianId)),
    db.select({ id: appointments.id }).from(appointments).where(and(
      eq(appointments.assignedTechnicianId, technicianId),
      or(eq(appointments.status, "pending_approval"), eq(appointments.status, "pending_calendar"), eq(appointments.status, "confirmed")),
      lt(appointments.scheduledStartAt, end),
      gt(appointments.scheduledEndAt, start),
      appointmentId ? ne(appointments.id, appointmentId) : undefined,
    )).limit(1),
  ]);

  if (conflicts.length) {
    return { ok: false, reason: "Technician already has another appointment during this time. Choose a different time or technician.", warnings: [] };
  }

  const unavailableException = exceptionRows.find(row =>
    !row.isAvailable && row.startAt < end && row.endAt > start
  );
  if (unavailableException) {
    return {
      ok: false,
      reason: unavailableException.exceptionType === "holiday"
        ? "Technician is marked unavailable for this date."
        : "Technician has approved time off during this appointment.",
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const availableException = exceptionRows.find(row => row.isAvailable && row.startAt <= start && row.endAt >= end);
  const startLocal = localParts(start);
  const endLocal = localParts(new Date(end.getTime() - 60000));

  if (!availableException) {
    if (startLocal.day !== endLocal.day) {
      warnings.push("This appointment crosses midnight. Confirm the technician can cover the full job.");
    } else {
      const schedule = dayRows.find(row => row.dayOfWeek === startLocal.day);
      if (!schedule) {
        warnings.push("No weekly schedule is configured for this day.");
      } else if (!schedule.isWorking) {
        warnings.push("This technician is not normally scheduled to work on this day.");
      } else {
        const hasHours = !!schedule.startTime && !!schedule.endTime;
        if (hasHours && (startLocal.time < schedule.startTime! || endLocal.time >= schedule.endTime!)) {
          warnings.push("This appointment is outside the technician's usual working hours.");
        }
        if (schedule.breakStartTime && schedule.breakEndTime &&
          startLocal.time < schedule.breakEndTime && endLocal.time >= schedule.breakStartTime) {
          warnings.push("This appointment overlaps the technician's scheduled break.");
        }
      }
    }
    if (emergency) {
      const schedule = dayRows.find(row => row.dayOfWeek === startLocal.day);
      const onCall = !!schedule?.isOnCall && !!schedule.onCallStartTime && !!schedule.onCallEndTime &&
        startLocal.time >= schedule.onCallStartTime && endLocal.time < schedule.onCallEndTime;
      if (!onCall && !availableException) warnings.push("The technician is not marked as on-call for this time.");
    }
  }

  if (context?.requiredSkill && skills.length) {
    const required = context.requiredSkill.toLowerCase();
    if (!skills.some(row => row.skill.toLowerCase().includes(required))) {
      warnings.push("Technician may not have the required skill: " + context.requiredSkill + ".");
    }
  }
  if (context?.postalCode && zipCodes.length &&
    !zipCodes.some(row => row.postalCode.toLowerCase() === context.postalCode!.toLowerCase())) {
    warnings.push("Technician may not cover the customer's service ZIP code.");
  }

  return { ok: true, reason: null, warnings };
}
