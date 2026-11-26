"use client";

import { useState } from "react";
import { Download, Mail, MapPin, Phone, Search, Users } from "lucide-react";
import { customers } from "@/lib/demo-data";
import { PageHeading } from "@/components/ui";
export default function CustomersPage() {
  const [query,setQuery]=useState("");
  const rows=customers.filter(c=>`${c.name} ${c.phone} ${c.email} ${c.id}`.toLowerCase().includes(query.toLowerCase()));
  return <div><PageHeading eyebrow="CUSTOMER DIRECTORY" title="Customers" description="Keep track of the people and households you serve." action={<div className="heading-count"><Users size={17}/>{customers.length} customers</div>}/><div className="toolbar single-toolbar"><label className="search-box"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by name, phone, or email"/></label><button className="button button-secondary" onClick={()=>window.alert("Demo only: customer export is not connected.")}><Download size={16}/> Export</button></div><div className="table-panel"><div className="table-scroll"><table><thead><tr><th>CUSTOMER</th><th>CONTACT</th><th>LOCATION</th><th>JOBS</th><th>LIFETIME SPEND</th><th>CUSTOMER SINCE</th></tr></thead><tbody>{rows.map(c=><tr key={c.id}><td><div className="customer-cell"><div className={`customer-avatar ${c.color}`}>{c.initials}</div><div><strong>{c.name}</strong><small>{c.id}</small></div></div></td><td><div className="contact-cell"><span><Phone size={12}/>{c.phone}</span><span><Mail size={12}/>{c.email}</span></div></td><td><div className="contact-cell"><span>{c.address}</span><span><MapPin size={12}/>{c.city}</span></div></td><td><strong>{c.jobs}</strong></td><td><strong>{c.spent}</strong></td><td className="muted-cell">{c.since}</td></tr>)}</tbody></table></div>{rows.length===0&&<div className="empty-state">No customers found.</div>}<div className="table-footer">Showing {rows.length} of {customers.length} customers <span>Sample customer records</span></div></div><div className="demo-note"><span className="demo-note-dot"/> Sample customer data. Customer records are not connected to a database.</div></div>;
}
