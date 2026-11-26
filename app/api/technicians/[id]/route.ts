import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { technicians } from "@/lib/db/schema";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const body = await request.json();
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!fullName || fullName.length > 120) return NextResponse.json({ error: "Enter a name (up to 120 characters)." }, { status: 400 });
    if (email.length > 254 || phone.length > 40) return NextResponse.json({ error: "Email or phone is too long." }, { status: 400 });
    const [updated] = await db.update(technicians).set({ fullName, email: email || null, phone: phone || null, isActive: body.isActive !== false }).where(eq(technicians.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Technician not found." }, { status: 404 });
    return NextResponse.json({ technician: updated });
  } catch (error) {
    console.error("PATCH /api/technicians/[id] failed:", error);
    const message = error instanceof Error && error.message.includes("unique") ? "That email is already used by another technician." : "Unable to update technician.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const [deleted] = await db.delete(technicians).where(eq(technicians.id, id)).returning({ id: technicians.id });
    if (!deleted) return NextResponse.json({ error: "Technician not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/technicians/[id] failed:", error);
    return NextResponse.json({ error: "Unable to delete technician." }, { status: 500 });
  }
}
