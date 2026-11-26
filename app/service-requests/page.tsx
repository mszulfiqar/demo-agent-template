"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { PageHeading, StatusBadge } from "@/components/ui";

type ServiceRequest = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  source: string;
  createdAt: string;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
};

const labels: Record<string, string> = {
  repair: "Repair",
  maintenance_tune_up: "Maintenance / tune-up",
  new_system_estimate: "New system estimate",
  warranty_callback: "Warranty callback",
};

export default function ServiceRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/service-requests")
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load service requests.");
        if (active) setRequests(data.requests);
      })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "Could not load service requests."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => requests.filter(request =>
    `${request.title} ${request.description} ${request.id} ${request.customerFirstName ?? ""} ${request.customerLastName ?? ""} ${request.customerPhone ?? ""}`
      .toLowerCase().includes(query.toLowerCase())
  ), [requests, query]);

  return <div>
    <PageHeading eyebrow="INCOMING WORK" title="Service requests" description="Review issues and opportunities captured by your AI receptionist." action={<div className="heading-count"><ClipboardList size={17}/>{requests.length} total requests</div>}/>
    <div className="toolbar single-toolbar"><label className="search-box"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search requests or customers"/></label></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="table-panel"><div className="table-scroll"><table><thead><tr><th>REQUEST</th><th>CUSTOMER</th><th>CATEGORY</th><th>PRIORITY</th><th>CREATED</th><th>SOURCE</th><th>STATUS</th></tr></thead><tbody>
      {rows.map(request => <tr key={request.id}>
        <td><div className="request-cell"><strong>{request.id.slice(0, 8).toUpperCase()}</strong><span>{request.title}</span>{request.description !== request.title && <small>{request.description}</small>}</div></td>
        <td><div className="contact-cell"><span>{[request.customerFirstName, request.customerLastName].filter(Boolean).join(" ") || "Unknown customer"}</span><span>{request.customerPhone || "No phone"}</span></div></td>
        <td>{labels[request.category] || request.category}</td>
        <td><span className={`priority ${request.priority}`}><i/>{request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}</span></td>
        <td className="muted-cell">{new Date(request.createdAt).toLocaleString()}</td>
        <td>{request.source.replaceAll("_", " ")}</td>
        <td><StatusBadge status={request.status}/></td>
      </tr>)}
    </tbody></table></div>
    {loading ? <div className="empty-state">Loading service requests…</div> : !error && rows.length === 0 ? <div className="empty-state">{query ? "No service requests match your search." : "No service requests have been created yet."}</div> : null}
    <div className="table-footer">Showing {rows.length} of {requests.length} requests <span>Live database records</span></div></div>
  </div>;
}
