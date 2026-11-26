"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Mail, MapPin, Phone, Search, Users } from "lucide-react";
import { PageHeading } from "@/components/ui";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string | null;
  createdAt: string;
};

function initials(customer: Customer) {
  return `${customer.firstName[0] ?? ""}${customer.lastName[0] ?? ""}`.toUpperCase();
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/customers")
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load customers.");
        if (active) setCustomers(data.customers);
      })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "Could not load customers."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => customers.filter(customer =>
    `${customer.firstName} ${customer.lastName} ${customer.phone} ${customer.email ?? ""} ${customer.address ?? ""}`
      .toLowerCase().includes(query.toLowerCase())
  ), [customers, query]);

  function exportCsv() {
    const header = ["First name", "Last name", "Phone", "Email", "Address", "Customer since"];
    const values = rows.map(c => [c.firstName, c.lastName, c.phone, c.email ?? "", c.address ?? "", new Date(c.createdAt).toLocaleDateString()]);
    const csv = [header, ...values].map(line => line.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url; link.download = "customers.csv"; link.click();
    URL.revokeObjectURL(url);
  }

  return <div>
    <PageHeading eyebrow="CUSTOMER DIRECTORY" title="Customers" description="Customer records captured by your HVAC team and AI receptionist." action={<div className="heading-count"><Users size={17}/>{customers.length} customers</div>}/>
    <div className="toolbar single-toolbar">
      <label className="search-box"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, phone, or email"/></label>
      <button className="button button-secondary" onClick={exportCsv} disabled={rows.length === 0}><Download size={16}/> Export</button>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="table-panel"><div className="table-scroll"><table><thead><tr><th>CUSTOMER</th><th>CONTACT</th><th>LOCATION</th><th>CUSTOMER SINCE</th></tr></thead><tbody>
      {rows.map(customer => <tr key={customer.id}>
        <td><div className="customer-cell"><div className="customer-avatar blue">{initials(customer)}</div><div><strong>{customer.firstName} {customer.lastName}</strong><small>{customer.id.slice(0, 8).toUpperCase()}</small></div></div></td>
        <td><div className="contact-cell"><span><Phone size={12}/>{customer.phone}</span><span><Mail size={12}/>{customer.email || "No email provided"}</span></div></td>
        <td><div className="contact-cell"><span>{customer.address || "No address on file"}</span>{customer.address && <span><MapPin size={12}/> Service address</span>}</div></td>
        <td className="muted-cell">{new Date(customer.createdAt).toLocaleDateString()}</td>
      </tr>)}
    </tbody></table></div>
    {loading ? <div className="empty-state">Loading customers…</div> : !error && rows.length === 0 ? <div className="empty-state">{query ? "No customers match your search." : "No customers yet. Customer records will appear here when they are captured."}</div> : null}
    <div className="table-footer">Showing {rows.length} of {customers.length} customers <span>Live database records</span></div></div>
  </div>;
}
