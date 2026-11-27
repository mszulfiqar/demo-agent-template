import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { technicians, technicianSkills, technicianServiceZipCodes } from "@/lib/db/schema";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const [tech] = await db.select({ id: technicians.id }).from(technicians).where(eq(technicians.id, id)).limit(1);
    if (!tech) return NextResponse.json({ error: "Technician not found." }, { status: 404 });
    const [skills, zipCodes] = await Promise.all([
      db.select().from(technicianSkills).where(eq(technicianSkills.technicianId, id)).orderBy(asc(technicianSkills.skill)),
      db.select().from(technicianServiceZipCodes).where(eq(technicianServiceZipCodes.technicianId, id)).orderBy(asc(technicianServiceZipCodes.postalCode)),
    ]);
    return NextResponse.json({ skills, zipCodes });
  } catch (error) { console.error("GET technician details:", error); return NextResponse.json({ error: "Unable to load technician details." }, { status: 500 }); }
}
export async function PUT(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const body = await request.json();
    const skills = Array.isArray(body.skills) ? [...new Set(body.skills.map((v: unknown) => String(v).trim()).filter((v: string) => v && v.length <= 80))] : [];
    const zipCodes = Array.isArray(body.zipCodes) ? [...new Set(body.zipCodes.map((v: unknown) => String(v).trim()).filter((v: string) => v && v.length <= 20))] : [];
    if (skills.length > 30 || zipCodes.length > 100) return NextResponse.json({ error: "Too many skills or ZIP codes." }, { status: 400 });
    const [tech] = await db.select({ id: technicians.id }).from(technicians).where(eq(technicians.id, id)).limit(1);
    if (!tech) return NextResponse.json({ error: "Technician not found." }, { status: 404 });
    await db.transaction(async tx => {
      await tx.delete(technicianSkills).where(eq(technicianSkills.technicianId, id));
      await tx.delete(technicianServiceZipCodes).where(eq(technicianServiceZipCodes.technicianId, id));
      if (skills.length) await tx.insert(technicianSkills).values(skills.map((skill: string) => ({ technicianId: id, skill })));
      if (zipCodes.length) await tx.insert(technicianServiceZipCodes).values(zipCodes.map((postalCode: string) => ({ technicianId: id, postalCode })));
    });
    return NextResponse.json({ success: true, skills, zipCodes });
  } catch (error) { console.error("PUT technician details:", error); return NextResponse.json({ error: "Unable to save technician skills and service areas." }, { status: 500 }); }
}
