import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { technicianScheduleExceptions } from "@/lib/db/schema";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const [deleted] = await db.delete(technicianScheduleExceptions).where(eq(technicianScheduleExceptions.id, id)).returning({ id: technicianScheduleExceptions.id });
    if (!deleted) return NextResponse.json({ error: "Schedule exception not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE schedule exception:", error);
    return NextResponse.json({ error: "Unable to delete schedule exception." }, { status: 500 });
  }
}
