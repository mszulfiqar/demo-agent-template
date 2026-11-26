"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown, Clock3, MapPin, Phone, Search, UserRound, X } from "lucide-react";
import { appointments as initialAppointments, technicians } from "@/lib/demo-data";
import { Button, PageHeading, StatusBadge } from "@/components/ui";

type Appointment = typeof initialAppointments[number];
export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>(initialAppointments);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [assignments, setAssignments] = useState<Record<string,string>>({});
  const visible = useMemo(()=>items.filter(a=>(filter==="all"||a.status===filter)&&(`${a.customer} ${a.id} ${a.service}`.toLowerCase().includes(query.toLowerCase()))),[items,filter,query]);
  function approve(id:string) {
    const tech = assignments[id];
    if (!tech) { window.alert("Please assign a technician before approving this appointment."); return; }
    setItems(prev=>prev.map(a=>a.id===id?{...a,status:"confirmed",technician:tech}:a));
    window.alert("Demo only: appointment marked approved. No Google Calendar booking or customer SMS was sent.");
  }
  function reject(id:string) { setItems(prev=>prev.map(a=>a.id===id?{...a,status:"rejected"}:a)); }
  return <div>
    <PageHeading eyebrow="SCHEDULING" title="Appointments" description="Review appointment requests, assign a technician, and approve the schedule." action={<div className="heading-count"><CalendarDays size={17}/> {items.filter(a=>a.status==="pending_approval").length} awaiting review</div>}/>
    <div className="notice-banner"><div className="notice-symbol"><Clock3 size={18}/></div><div><strong>Approval required before confirmation</strong><p>AI-created appointments stay pending until you assign a technician and approve them. Calendar and SMS actions are not connected in this demo.</p></div></div>
    <div className="toolbar"><div className="tabs">{[["all","All"],["pending_approval","Needs approval"],["confirmed","Confirmed"],["completed","Completed"],["rejected","Rejected"]].map(([key,label])=><button key={key} className={filter===key?"tab active":"tab"} onClick={()=>setFilter(key)}>{label}{key==="pending_approval"&&<b>{items.filter(a=>a.status==="pending_approval").length}</b>}</button>)}</div><label className="search-box"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search appointments"/></label></div>
    <div className="appointment-list">{visible.map(a=><article className="appointment-card" key={a.id}><div className="appointment-main"><div className="appointment-date-icon"><CalendarDays size={19}/></div><div className="appointment-content"><div className="appointment-title-line"><h3>{a.customer}</h3><StatusBadge status={a.status}/></div><div className="appointment-service">{a.service}</div><div className="appointment-meta"><span><CalendarDays size={14}/>{a.date}</span><span><Clock3 size={14}/>{a.time}</span><span><MapPin size={14}/>{a.address}</span></div><div className="appointment-meta secondary"><span><Phone size={13}/>{a.phone}</span><span>Request {a.id}</span><span>Source: {a.source}</span></div></div></div>
      {a.status==="pending_approval"?<div className="appointment-actions"><label className="assign-select"><UserRound size={15}/><select value={assignments[a.id]??""} onChange={e=>setAssignments(p=>({...p,[a.id]:e.target.value}))}><option value="">Assign technician</option>{technicians.map(t=><option key={t}>{t}</option>)}</select><ChevronDown size={14}/></label><div className="action-buttons"><Button onClick={()=>approve(a.id)}><Check size={15}/> Approve</Button><Button variant="secondary" onClick={()=>reject(a.id)}><X size={15}/> Reject</Button></div></div>:<div className="assigned-tech"><div className="tech-avatar">{a.technician?a.technician.split(" ").map(n=>n[0]).join(""):"—"}</div><div><small>Assigned technician</small><strong>{a.technician||"Not assigned"}</strong></div></div>}
    </article>)}</div>
    {visible.length===0&&<div className="empty-state">No appointments match this filter.</div>}
    <div className="demo-note"><span className="demo-note-dot"/> Local demo only: approving changes this page’s sample state. It does not book a calendar or send a confirmation.</div>
  </div>;
}
