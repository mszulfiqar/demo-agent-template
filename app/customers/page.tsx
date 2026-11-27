"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Mail, MapPin, Phone, Plus, Search, Users, X } from "lucide-react";
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
type CustomerForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
};
const emptyForm: CustomerForm = {
  firstName: "", lastName: "", phone: "", email: "",
  addressLine1: "", city: "", state: "", postalCode: "",
};

function initials(customer: Customer) {
  return `${customer.firstName[0] ?? ""}${customer.lastName[0] ?? ""}`.toUpperCase();
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [error, setError] = useState("");

  async function loadCustomers() {
    setLoading(true);
    try {
      const response = await fetch("/api/customers");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load customers.");
      setCustomers(data.customers);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadCustomers(); }, []);

  const rows = useMemo(() => customers.filter(customer =>
    `${customer.firstName} ${customer.lastName} ${customer.phone} ${customer.email ?? ""} ${customer.address ?? ""}`
      .toLowerCase().includes(query.toLowerCase())
  ), [customers, query]);

  function openCreate() {
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create customer.");
      setShowForm(false);
      setForm(emptyForm);
      await loadCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create customer.");
    } finally {
      setSaving(false);
    }
  }

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
    <PageHeading
      eyebrow="CUSTOMER DIRECTORY"
      title="Customers"
      description="Customer records captured by your HVAC team and AI receptionist."
      action={<button className="button button-primary" onClick={openCreate}><Plus size={17}/> Add customer</button>}
    />
    <div className="toolbar single-toolbar">
      <label className="search-box"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, phone, or email"/></label>
      <div className="toolbar-actions">
        <div className="heading-count"><Users size={17}/>{customers.length} customers</div>
        <button className="button button-secondary" onClick={exportCsv} disabled={rows.length === 0}><Download size={16}/> Export</button>
      </div>
    </div>
    {error && !showForm && <div className="form-error" role="alert">{error}</div>}
    <div className="table-panel"><div className="table-scroll"><table><thead><tr><th>CUSTOMER</th><th>CONTACT</th><th>LOCATION</th><th>CUSTOMER SINCE</th></tr></thead><tbody>
      {rows.map(customer => <tr key={customer.id}>
        <td><div className="customer-cell"><div className="customer-avatar blue">{initials(customer)}</div><div><strong>{customer.firstName} {customer.lastName}</strong><small>{customer.id.slice(0, 8).toUpperCase()}</small></div></div></td>
        <td><div className="contact-cell"><span><Phone size={12}/>{customer.phone}</span><span><Mail size={12}/>{customer.email || "No email provided"}</span></div></td>
        <td><div className="contact-cell"><span>{customer.address || "No address on file"}</span>{customer.address && <span><MapPin size={12}/> Service address</span>}</div></td>
        <td className="muted-cell">{new Date(customer.createdAt).toLocaleDateString()}</td>
      </tr>)}
    </tbody></table></div>
    {loading ? <div className="empty-state">Loading customers…</div> : !error && rows.length === 0 ? <div className="empty-state">{query ? "No customers match your search." : "No customers yet. Add your first customer to get started."}</div> : null}
    <div className="table-footer">Showing {rows.length} of {customers.length} customers <span>Live database records</span></div></div>

    {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !saving) setShowForm(false); }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="customer-form-title">
        <div className="modal-heading"><div><div className="eyebrow">CUSTOMER PROFILE</div><h2 id="customer-form-title">Add customer</h2></div><button className="icon-button" aria-label="Close" onClick={() => setShowForm(false)} disabled={saving}><X size={18}/></button></div>
        <form onSubmit={submit} className="technician-form">
          <div className="customer-form-grid">
            <label>First name<input required maxLength={100} autoFocus value={form.firstName} onChange={e => setForm({...form, firstName:e.target.value})} placeholder="e.g. Jordan"/></label>
            <label>Last name<input required maxLength={100} value={form.lastName} onChange={e => setForm({...form, lastName:e.target.value})} placeholder="e.g. Smith"/></label>
          </div>
          <label>Phone number<input required type="tel" maxLength={40} value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="e.g. +1 555 010 1234"/></label>
          <label>Email address (optional)<input type="email" maxLength={254} value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="e.g. jordan@example.com"/></label>
          <div className="form-section-label">SERVICE ADDRESS <span>Optional</span></div>
          <label>Street address<input maxLength={200} value={form.addressLine1} onChange={e => setForm({...form, addressLine1:e.target.value})} placeholder="Street and house number"/></label>
          <div className="customer-form-grid">
            <label>City<input maxLength={100} value={form.city} onChange={e => setForm({...form, city:e.target.value})} placeholder="City"/></label>
            <label>State<input maxLength={100} value={form.state} onChange={e => setForm({...form, state:e.target.value})} placeholder="State"/></label>
          </div>
          <label>ZIP code<input maxLength={20} value={form.postalCode} onChange={e => setForm({...form, postalCode:e.target.value})} placeholder="ZIP code"/></label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Create customer"}</button></div>
        </form>
      </section>
    </div>}
  </div>;
}
