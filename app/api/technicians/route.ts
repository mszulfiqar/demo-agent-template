import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { technicians } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await db.select().from(technicians).orderBy(asc(technicians.fullName));
    return NextResponse.json({ technicians: rows });
  } catch (error) {
    console.error("GET /api/technicians failed:", error);
    return NextResponse.json({ error: "Unable to load technicians." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!fullName || fullName.length > 120) return NextResponse.json({ error: "Enter a name (up to 120 characters)." }, { status: 400 });
    if (email.length > 254 || phone.length > 40) return NextResponse.json({ error: "Email or phone is too long." }, { status: 400 });
    const [created] = await db.insert(technicians).values({ fullName, email: email || null, phone: phone || null, isActive: body.isActive !== false }).returning();
    return NextResponse.json({ technician: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/technicians failed:", error);
    const message = error instanceof Error && error.message.includes("unique") ? "That email is already used by another technician." : "Unable to create technician.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
