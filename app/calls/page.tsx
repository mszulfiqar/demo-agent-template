"use client";

import { useEffect, useMemo, useState } from "react";
import { PhoneCall, Search, FileText, ExternalLink } from "lucide-react";
import { PageHeading, StatusBadge } from "@/components/ui";

type Call = {
  id: string;
  direction: string;
  status: string;
  outcome: string | null;
  fromPhone: string | null;
  toPhone: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  summary: string | null;
  transcript: string | null;
  recordingUrl: string | null;
  livekitRoomName: string | null;
  createdAt: string;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
};

function duration(seconds: number | null) {
  if (seconds == null) return "—";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}
function label(value: string | null) {
  if (!value) return "Not recorded";
  return value.replaceAll("_", " ").replace(/\\b\\w/g, char => char.toUpperCase());
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/calls")
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load call history.");
        if (active) setCalls(data.calls);
      })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "Could not load call history."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => calls.filter(call => {
    const customer = [call.customerFirstName, call.customerLastName].filter(Boolean).join(" ") || "Unknown caller";
    return `${customer} ${call.customerPhone ?? ""} ${call.fromPhone ?? ""} ${call.toPhone ?? ""} ${call.id} ${call.outcome ?? ""} ${call.summary ?? ""}`
      .toLowerCase().includes(query.toLowerCase());
  }), [calls, query]);

  return <div>
    <PageHeading eyebrow="VOICE ACTIVITY" title="Call history" description="Review call activity, outcomes, transcripts, and recordings saved by your AI receptionist." action={<div className="heading-count"><PhoneCall size={17}/>{calls.length} calls</div>}/>
    <div className="toolbar single-toolbar"><label className="search-box"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search calls by customer, phone, or outcome"/></label></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="call-history-list">{rows.map(call => {
      const customer = [call.customerFirstName, call.customerLastName].filter(Boolean).join(" ") || "Unknown caller";
      const phone = call.customerPhone || call.fromPhone || call.toPhone || "No phone number";
      const time = new Date(call.startedAt || call.createdAt).toLocaleString();
      const status = call.status === "completed" ? "completed" : call.status;
      return <article className="call-card" key={call.id}>
        <div className={`call-avatar ${call.status === "missed" ? "missed" : "answered"}`}><PhoneCall size={18}/></div>
        <div className="call-card-main">
          <div className="call-card-title"><strong>{customer}</strong><StatusBadge status={status}/></div>
          <div className="call-card-sub">{phone} <span>·</span> {time} <span>·</span> {duration(call.durationSeconds)} <span>·</span> {label(call.direction)}</div>
          <p>{call.summary || "No call summary has been saved."}</p>
          <button className="button button-quiet" onClick={() => setExpanded(expanded === call.id ? null : call.id)}><FileText size={14}/>{expanded === call.id ? "Hide details" : "View details"}</button>
          {expanded === call.id && <div className="call-detail-panel">
            <div><small>CALL OUTCOME</small><strong>{label(call.outcome)}</strong></div>
            <div><small>LIVEKIT ROOM</small><strong>{call.livekitRoomName || "Not linked"}</strong></div>
            <div><small>TRANSCRIPT</small><p className="call-transcript">{call.transcript || "No transcript has been saved for this call."}</p></div>
            {call.recordingUrl && <a className="button button-secondary" href={call.recordingUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open recording</a>}
          </div>}
        </div>
        <div className="call-outcome"><small>CALL OUTCOME</small><strong>{label(call.outcome)}</strong><span>{call.id.slice(0, 8).toUpperCase()}</span></div>
      </article>;
    })}</div>
    {loading && <div className="empty-state">Loading call history…</div>}
    {!loading && !error && rows.length === 0 && <div className="empty-state">{query ? "No calls match your search." : "No calls have been recorded yet. Calls will appear here when your backend saves them."}</div>}
    <div className="table-footer">Showing {rows.length} of {calls.length} calls <span>Live database records</span></div>
  </div>;
}
