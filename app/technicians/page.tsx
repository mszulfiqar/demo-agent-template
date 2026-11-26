"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Wrench, X } from "lucide-react";
import { PageHeading } from "@/components/ui";

type Technician = { id: string; fullName: string; email: string | null; phone: string | null; isActive: boolean };
type FormState = { fullName: string; email: string; phone: string; isActive: boolean };
const emptyForm: FormState = { fullName: "", email: "", phone: "", isActive: true };

export default function TechniciansPage() {
  const [items, setItems] = useState<Technician[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/technicians");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load technicians.");
      setItems(data.technicians);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load technicians."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => items.filter(t => [t.fullName, t.email ?? "", t.phone ?? ""].join(" ").toLowerCase().includes(query.toLowerCase())), [items, query]);
  function openCreate() { setEditing(null); setForm(emptyForm); setError(""); setShowForm(true); }
  function openEdit(item: Technician) { setEditing(item.id); setForm({ fullName: item.fullName, email: item.email ?? "", phone: item.phone ?? "", isActive: item.isActive }); setError(""); setShowForm(true); }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch(editing ? `/api/technicians/${editing}` : "/api/technicians", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save technician.");
      setShowForm(false); setForm(emptyForm); setEditing(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save technician."); }
    finally { setSaving(false); }
  }
  async function remove(item: Technician) {
    if (!window.confirm(`Delete ${item.fullName}'s profile? Existing appointments will keep working but become unassigned.`)) return;
    const response = await fetch(`/api/technicians/${item.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not delete technician."); return; }
    setItems(current => current.filter(t => t.id !== item.id));
  }

  return <div>
    <PageHeading eyebrow="TEAM DIRECTORY" title="Technicians" description="Manage the technician profiles used when assigning appointments." action={<button className="button button-primary" onClick={openCreate}><Plus size={17}/> Add technician</button>} />
    <div className="toolbar single-toolbar"><label className="search-box"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search technicians by name, phone, or email"/></label><div className="heading-count"><Wrench size={16}/>{items.length} technicians</div></div>
    {error && !showForm && <div className="form-error" role="alert">{error}</div>}
    <div className="table-panel"><div className="table-scroll"><table><thead><tr><th>TECHNICIAN</th><th>PHONE</th><th>EMAIL</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
      {filtered.map(item => <tr key={item.id}><td><div className="customer-cell"><div className="customer-avatar blue">{item.fullName.split(" ").map(p => p[0]).slice(0,2).join("").toUpperCase()}</div><div><strong>{item.fullName}</strong><small>Technician</small></div></div></td><td>{item.phone || "—"}</td><td>{item.email || "—"}</td><td><span className={`status-badge ${item.isActive ? "confirmed" : "neutral"}`}><i/>{item.isActive ? "Active" : "Inactive"}</span></td><td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${item.fullName}`} onClick={() => openEdit(item)}><Pencil size={15}/></button><button className="icon-button" aria-label={`Delete ${item.fullName}`} onClick={() => void remove(item)}><Trash2 size={15}/></button></div></td></tr>)}
    </tbody></table></div>{loading ? <div className="empty-state">Loading technicians…</div> : filtered.length === 0 ? <div className="empty-state">{query ? "No technicians match your search." : "No technicians yet. Add your first technician to get started."}</div> : null}<div className="table-footer">Showing {filtered.length} of {items.length} technicians <span>Live database records</span></div></div>
    {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="technician-form-title"><div className="modal-heading"><div><div className="eyebrow">TECHNICIAN PROFILE</div><h2 id="technician-form-title">{editing ? "Edit technician" : "Add technician"}</h2></div><button className="icon-button" aria-label="Close" onClick={() => setShowForm(false)}><X size={18}/></button></div><form onSubmit={submit} className="technician-form"><label>Full name<input required maxLength={120} value={form.fullName} onChange={e => setForm({...form, fullName:e.target.value})} placeholder="e.g. Alex Johnson"/></label><label>Phone number<input type="tel" maxLength={40} value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="e.g. +1 555 010 1234"/></label><label>Email address<input type="email" maxLength={254} value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="e.g. alex@example.com"/></label><label className="checkbox-label"><input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive:e.target.checked})}/> Active technician</label>{error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add technician"}</button></div></form></section></div>}
  </div>;
}
