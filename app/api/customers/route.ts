import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const addressLine1 = typeof body.addressLine1 === "string" ? body.addressLine1.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const state = typeof body.state === "string" ? body.state.trim() : "";
    const postalCode = typeof body.postalCode === "string" ? body.postalCode.trim() : "";

    if (!firstName || firstName.length > 100) return NextResponse.json({ error: "Enter a first name (up to 100 characters)." }, { status: 400 });
    if (!lastName || lastName.length > 100) return NextResponse.json({ error: "Enter a last name (up to 100 characters)." }, { status: 400 });
    if (!phone || phone.length > 40) return NextResponse.json({ error: "Enter a phone number (up to 40 characters)." }, { status: 400 });
    if (email.length > 254) return NextResponse.json({ error: "Email address is too long." }, { status: 400 });
    if (addressLine1.length > 200 || city.length > 100 || state.length > 100 || postalCode.length > 20) {
      return NextResponse.json({ error: "One or more address fields are too long." }, { status: 400 });
    }
    const hasAddress = Boolean(addressLine1 || city || state || postalCode);
    if (hasAddress && (!addressLine1 || !city)) {
      return NextResponse.json({ error: "Enter both a street address and city, or leave the address blank." }, { status: 400 });
    }

    const [created] = await db.insert(customers).values({
      firstName, lastName, phone, email: email || null,
    }).returning();

    if (hasAddress) {
      await db.insert(customerAddresses).values({
        customerId: created.id,
        addressLine1,
        city,
        state: state || null,
        postalCode: postalCode || null,
        isDefault: true,
      });
    }

    return NextResponse.json({ customer: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/customers failed:", error);
    const message = error instanceof Error && (error.message.toLowerCase().includes("unique") || error.message.toLowerCase().includes("duplicate"))
      ? "A customer with that phone number already exists."
      : "Unable to create customer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
