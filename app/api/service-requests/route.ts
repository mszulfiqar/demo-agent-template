import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, serviceRequests } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await db.select({
      id: serviceRequests.id,
      title: serviceRequests.title,
      description: serviceRequests.description,
      category: serviceRequests.category,
      priority: serviceRequests.priority,
      status: serviceRequests.status,
      source: serviceRequests.source,
      createdAt: serviceRequests.createdAt,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      customerPhone: customers.phone,
    }).from(serviceRequests)
      .leftJoin(customers, eq(serviceRequests.customerId, customers.id))
      .orderBy(desc(serviceRequests.createdAt));
    return NextResponse.json({ requests: rows });
  } catch (error) {
    console.error("GET /api/service-requests failed:", error);
    return NextResponse.json({ error: "Unable to load service requests." }, { status: 500 });
  }
}
