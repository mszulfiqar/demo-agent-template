"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, MapPin, Phone, Search, UserRound, X } from "lucide-react";
import { PageHeading, StatusBadge } from "@/components/ui";

type Appointment = {
  id: string;
  status: string;
  requestedStartAt: string | null;
  requestedEndAt: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  source: string;
  calendarStatus: string;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
  serviceTitle: string | null;
  technicianId: string | null;
  technicianName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
};
type Technician = { id: string; fullName: string; isActive: boolean };

const filters = [["all", "All"], ["pending_approval", "Needs approval"], ["confirmed", "Confirmed"], ["completed", "Completed"], ["rejected", "Rejected"], ["cancelled", "Cancelled"]] as const;

function formatDate(value: string | null) {
  if (!value) return "Date not selected";
  return new Date(value).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function formatTime(start: string | null, end: string | null) {
  if (!start) return "Time not selected";
  const options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const first = new Date(start).toLocaleTimeString(undefined, options);
  return end ? `${first} – ${new Date(end).toLocaleTimeString(undefined, options)}` : first;
}

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    const [appointmentResponse, technicianResponse] = await Promise.all([fetch("/api/appointments"), fetch("/api/technicians")]);
    const [appointmentData, technicianData] = await Promise.all([appointmentResponse.json(), technicianResponse.json()]);
    if (!appointmentResponse.ok) throw new Error(appointmentData.error || "Unable to load appointments.");
    if (!technicianResponse.ok) throw new Error(technicianData.error || "Unable to load technicians.");
    setItems(appointmentData.appointments);
    setTechnicians(technicianData.technicians.filter((t: Technician) => t.isActive));
  }, []);

  useEffect(() => {
    loadData().catch(err => setError(err instanceof Error ? err.message : "Unable to load appointments.")).finally(() => setLoading(false));
  }, [loadData]);

  const visible = useMemo(() => items.filter(item => {
    const customer = `${item.customerFirstName ?? ""} ${item.customerLastName ?? ""}`;
    return (filter === "all" || item.status === filter) &&
      `${customer} ${item.id} ${item.serviceTitle ?? ""} ${item.customerPhone ?? ""}`.toLowerCase().includes(query.toLowerCase());
  }), [items, filter, query]);

  async function updateAppointment(id: string, action: "assign" | "approve" | "reject") {
    const technicianId = assignments[id] || items.find(item => item.id === id)?.technicianId || "";
    if (action !== "reject" && !technicianId) { setError("Please assign an active technician first."); return; }
    setBusyId(id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, technicianId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update appointment.");
      await loadData();
      setNotice(action === "approve"
        ? "Appointment approved, scheduled and confirmed."
        : action === "reject" ? "Appointment request rejected." : "Technician assignment saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update appointment.");
    } finally { setBusyId(""); }
  }

  return <div>
    <PageHeading eyebrow="SCHEDULING" title="Appointments" description="Review AI appointment requests and approve them into your internal dispatch schedule." action={<div className="heading-count"><CalendarDays size={17}/>{items.filter(item => item.status === "pending_approval").length} awaiting review</div>}/>
    <div className="notice-banner"><div className="notice-symbol"><Clock3 size={18}/></div><div><strong>AI requests need owner approval</strong><p>Choose a technician and approve the request. The system checks availability and then confirms the job in your dispatch calendar. Jobs created directly from the dispatch calendar are confirmed immediately.</p></div></div>
    <div className="toolbar"><div className="tabs">{filters.map(([key, label]) => <button key={key} className={filter === key ? "tab active" : "tab"} onClick={() => setFilter(key)}>{label}{key === "pending_approval" && <b>{items.filter(item => item.status === key).length}</b>}</button>)}</div><label className="search-box"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search appointments"/></label></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {notice && <div className="notice-banner"><div className="notice-symbol"><Check size={18}/></div><div><strong>Update saved</strong><p>{notice}</p></div></div>}
    <div className="appointment-list">{visible.map(item => {
      const customer = [item.customerFirstName, item.customerLastName].filter(Boolean).join(" ") || "Unknown customer";
      const address = [item.addressLine1, item.addressLine2, item.city, item.state, item.postalCode].filter(Boolean).join(", ");
      const date = item.scheduledStartAt || item.requestedStartAt;
      const end = item.scheduledEndAt || item.requestedEndAt;
      const selectedTechnician = assignments[item.id] ?? item.technicianId ?? "";
      return <article className="appointment-card" key={item.id}>
        <div className="appointment-main"><div className="appointment-date-icon"><CalendarDays size={19}/></div><div className="appointment-content">
          <div className="appointment-title-line"><h3>{customer}</h3><StatusBadge status={item.status}/></div>
          <div className="appointment-service">{item.serviceTitle || "Service appointment"}</div>
          <div className="appointment-meta"><span><CalendarDays size={14}/>{formatDate(date)}</span><span><Clock3 size={14}/>{formatTime(date, end)}</span>{address && <span><MapPin size={14}/>{address}</span>}</div>
          <div className="appointment-meta secondary"><span><Phone size={13}/>{item.customerPhone || "No phone"}</span><span>Request {item.id.slice(0, 8).toUpperCase()}</span><span>Source: {item.source.replaceAll("_", " ")}</span></div>
        </div></div>
        {item.status === "pending_approval" ? <div className="appointment-actions">
          <label className="assign-select"><UserRound size={15}/><select value={selectedTechnician} onChange={event => setAssignments(current => ({ ...current, [item.id]: event.target.value }))}><option value="">Assign technician</option>{technicians.map(technician => <option key={technician.id} value={technician.id}>{technician.fullName}</option>)}</select></label>
          <div className="action-buttons"><button className="button" disabled={busyId === item.id} onClick={() => updateAppointment(item.id, "approve")}><Check size={15}/>{busyId === item.id ? "Saving…" : "Approve request"}</button><button className="button button-secondary" disabled={busyId === item.id} onClick={() => updateAppointment(item.id, "reject")}><X size={15}/> Reject</button></div>
        </div> : <div className="assigned-tech"><div className="tech-avatar">{item.technicianName?.split(" ").map(part => part[0]).join("") || "—"}</div><div><small>Assigned technician</small><strong>{item.technicianName || "Not assigned"}</strong></div></div>}
      </article>;
    })}</div>
    {loading && <div className="empty-state">Loading appointments…</div>}
    {!loading && !error && visible.length === 0 && <div className="empty-state">No appointments match this filter.</div>}
    <div className="table-footer">Showing {visible.length} of {items.length} appointments <span>Live database records</span></div>
  </div>;
}
