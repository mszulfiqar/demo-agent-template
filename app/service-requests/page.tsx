"use client";

import { useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { requests } from "@/lib/demo-data";
import { PageHeading, StatusBadge } from "@/components/ui";
export default function ServiceRequestsPage() {
 const [query,setQuery]=useState("");
 const rows=requests.filter(r=>`${r.customer} ${r.issue} ${r.id}`.toLowerCase().includes(query.toLowerCase()));
 return <div><PageHeading eyebrow="INCOMING WORK" title="Service requests" description="Review the issues and opportunities captured by your AI receptionist." action={<div className="heading-count"><ClipboardList size={17}/>{requests.length} total requests</div>}/><div className="toolbar single-toolbar"><label className="search-box"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search requests"/></label></div><div className="table-panel"><div className="table-scroll"><table><thead><tr><th>REQUEST</th><th>CUSTOMER</th><th>CATEGORY</th><th>PRIORITY</th><th>CREATED</th><th>SOURCE</th><th>STATUS</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><div className="request-cell"><strong>{r.id}</strong><span>{r.issue}</span></div></td><td>{r.customer}</td><td>{r.category}</td><td><span className={`priority ${r.priority.toLowerCase()}`}><i/>{r.priority}</span></td><td className="muted-cell">{r.created}</td><td>{r.source}</td><td><StatusBadge status={r.status}/></td></tr>)}</tbody></table></div>{rows.length===0&&<div className="empty-state">No service requests found.</div>}<div className="table-footer">Showing {rows.length} of {requests.length} requests <span>Sample request records</span></div></div><div className="demo-note"><span className="demo-note-dot"/> Request statuses are sample data and do not trigger dispatch or customer notifications.</div></div>;
}
