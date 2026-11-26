"use client";

import { useState } from "react";
import { PhoneCall, Search } from "lucide-react";
import { calls } from "@/lib/demo-data";
import { PageHeading, StatusBadge } from "@/components/ui";
export default function CallsPage() {
 const [query,setQuery]=useState("");
 const rows=calls.filter(c=>`${c.customer} ${c.phone} ${c.id} ${c.outcome}`.toLowerCase().includes(query.toLowerCase()));
 return <div><PageHeading eyebrow="VOICE ACTIVITY" title="Call history" description="See recent inbound calls and the outcomes captured by your AI receptionist." action={<div className="heading-count"><PhoneCall size={17}/>{calls.length} recent calls</div>}/><div className="toolbar single-toolbar"><label className="search-box"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search calls"/></label></div><div className="call-history-list">{rows.map(c=><article className="call-card" key={c.id}><div className={`call-avatar ${c.result}`}><PhoneCall size={18}/></div><div className="call-card-main"><div className="call-card-title"><strong>{c.customer}</strong><StatusBadge status={c.result}/></div><div className="call-card-sub">{c.phone} <span>·</span> {c.time} <span>·</span> {c.duration}</div><p>{c.summary}</p></div><div className="call-outcome"><small>CALL OUTCOME</small><strong>{c.outcome}</strong><span>{c.id}</span></div></article>)}</div>{rows.length===0&&<div className="empty-state">No calls found.</div>}<div className="demo-note"><span className="demo-note-dot"/> Sample call records only. LiveKit call logs and recordings are not connected.</div></div>;
}
