import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, customerAddresses } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await db.select().from(customers).orderBy(desc(customers.createdAt));
    const addresses = await db.select().from(customerAddresses);
    const defaultAddressByCustomer = new Map<string, typeof addresses[number]>();
    for (const address of addresses) {
      const current = defaultAddressByCustomer.get(address.customerId);
      if (!current || address.isDefault) defaultAddressByCustomer.set(address.customerId, address);
    }
    const result = rows.map(customer => {
      const address = defaultAddressByCustomer.get(customer.id);
      return {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email,
        notes: customer.notes,
        createdAt: customer.createdAt,
        address: address ? [address.addressLine1, address.addressLine2, address.city, address.state, address.postalCode].filter(Boolean).join(", ") : null,
      };
    });
    return NextResponse.json({ customers: result });
  } catch (error) {
    console.error("GET /api/customers failed:", error);
    return NextResponse.json({ error: "Unable to load customers." }, { status: 500 });
  }
}
