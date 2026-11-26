import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { calls, customers } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await db.select({
      id: calls.id,
      direction: calls.direction,
      status: calls.status,
      outcome: calls.outcome,
      fromPhone: calls.fromPhone,
      toPhone: calls.toPhone,
      startedAt: calls.startedAt,
      answeredAt: calls.answeredAt,
      endedAt: calls.endedAt,
      durationSeconds: calls.durationSeconds,
      summary: calls.summary,
      transcript: calls.transcript,
      recordingUrl: calls.recordingUrl,
      livekitRoomName: calls.livekitRoomName,
      createdAt: calls.createdAt,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      customerPhone: customers.phone,
    }).from(calls)
      .leftJoin(customers, eq(calls.customerId, customers.id))
      .orderBy(desc(calls.createdAt));
    return NextResponse.json({ calls: rows });
  } catch (error) {
    console.error("GET /api/calls failed:", error);
    return NextResponse.json({ error: "Unable to load call history." }, { status: 500 });
  }
}
