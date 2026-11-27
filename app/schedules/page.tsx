"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Clock3, Save, ShieldCheck } from "lucide-react";
import { PageHeading } from "@/components/ui";

type Day = {
  dayOfWeek: number; isWorking: boolean; startTime: string; endTime: string;
  breakStartTime: string; breakEndTime: string; isOnCall: boolean;
  onCallStartTime: string; onCallEndTime: string;
};
type Technician = { id: string; fullName: string; isActive: boolean };
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const blankDays = (): Day[] => dayNames.map((_, dayOfWeek) => ({
  dayOfWeek, isWorking: dayOfWeek >= 1 && dayOfWeek <= 5,
  startTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "08:00" : "",
  endTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "17:00" : "",
  breakStartTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "12:00" : "",
  breakEndTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "13:00" : "",
  isOnCall: false, onCallStartTime: "", onCallEndTime: "",
}));

export default function SchedulesPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [days, setDays] = useState<Day[]>(blankDays);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/technician-schedules").then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load schedules.");
      if (!active) return;
      setTechnicians(data.technicians);
      const first = data.technicians.find((t: Technician) => t.isActive) ?? data.technicians[0];
      if (first) {
        setSelectedId(first.id);
        const saved = data.schedules.filter((s: any) => s.technicianId === first.id);
        if (saved.length) setDays(blankDays().map(day => {
          const item = saved.find((s: any) => s.dayOfWeek === day.dayOfWeek);
          return item ? { ...day, ...item, startTime: item.startTime ?? "", endTime: item.endTime ?? "", breakStartTime: item.breakStartTime ?? "", breakEndTime: item.breakEndTime ?? "", onCallStartTime: item.onCallStartTime ?? "", onCallEndTime: item.onCallEndTime ?? "" } : day;
        }));
      }
    }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function changeTechnician(id: string) {
    setSelectedId(id); setError(""); setSuccess("");
    const response = await fetch("/api/technician-schedules");
    const data = await response.json();
    const saved = data.schedules.filter((s: any) => s.technicianId === id);
    setDays(blankDays().map(day => {
      const item = saved.find((s: any) => s.dayOfWeek === day.dayOfWeek);
      return item ? { ...day, ...item, startTime: item.startTime ?? "", endTime: item.endTime ?? "", breakStartTime: item.breakStartTime ?? "", breakEndTime: item.breakEndTime ?? "", onCallStartTime: item.onCallStartTime ?? "", onCallEndTime: item.onCallEndTime ?? "" } : day;
    }));
  }

  function update(index: number, patch: Partial<Day>) {
    setDays(current => current.map((day, i) => i === index ? { ...day, ...patch } : day));
    setSuccess("");
  }
  async function save() {
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/technician-schedules", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId: selectedId, days }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save schedule.");
      setSuccess("Weekly schedule saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save schedule."); }
    finally { setSaving(false); }
  }
  const activeCount = useMemo(() => days.filter(d => d.isWorking).length, [days]);
  const onCallCount = useMemo(() => days.filter(d => d.isOnCall).length, [days]);

  return <div>
    <PageHeading eyebrow="TECHNICIAN SCHEDULING" title="Technician Schedules" description="Set recurring working hours, breaks, and emergency on-call coverage." action={<button className="button button-primary" onClick={save} disabled={!selectedId || saving}><Save size={16}/>{saving ? "Saving…" : "Save schedule"}</button>} />
    <div className="schedule-toolbar panel">
      <div><span className="schedule-field-label">TECHNICIAN</span><select value={selectedId} onChange={e => void changeTechnician(e.target.value)} disabled={loading || technicians.length === 0}>{technicians.map(t => <option key={t.id} value={t.id}>{t.fullName}{t.isActive ? "" : " (Inactive)"}</option>)}</select></div>
      <div className="schedule-summary"><span><Clock3 size={15}/>{activeCount} working days</span><span><ShieldCheck size={15}/>{onCallCount} on-call days</span></div>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {success && <div className="schedule-success" role="status">{success}</div>}
    {loading ? <div className="empty-state">Loading schedules…</div> : technicians.length === 0 ? <div className="empty-state">Add a technician first, then configure their schedule.</div> : <div className="weekly-schedule-list">
      {days.map((day, index) => <section className="weekly-day-card" key={day.dayOfWeek}>
        <div className="weekly-day-heading"><div><strong>{dayNames[day.dayOfWeek]}</strong><small>{day.isWorking ? "Regular shift" : "Day off"}</small></div><label className="switch-label"><input type="checkbox" checked={day.isWorking} onChange={e => update(index, { isWorking: e.target.checked })}/><span className="switch-track"/><span>Working</span></label></div>
        <div className={`weekly-day-fields ${day.isWorking ? "" : "disabled-fields"}`}>
          <label>Start<input type="time" value={day.startTime} disabled={!day.isWorking} onChange={e => update(index, { startTime: e.target.value })}/></label>
          <label>End<input type="time" value={day.endTime} disabled={!day.isWorking} onChange={e => update(index, { endTime: e.target.value })}/></label>
          <label>Break starts<input type="time" value={day.breakStartTime} disabled={!day.isWorking} onChange={e => update(index, { breakStartTime: e.target.value })}/></label>
          <label>Break ends<input type="time" value={day.breakEndTime} disabled={!day.isWorking} onChange={e => update(index, { breakEndTime: e.target.value })}/></label>
        </div>
        <div className="oncall-row"><div className="oncall-copy"><ShieldCheck size={17}/><div><strong>Emergency on-call</strong><small>Available outside regular working hours</small></div></div><label className="switch-label oncall-switch"><input type="checkbox" checked={day.isOnCall} onChange={e => update(index, { isOnCall: e.target.checked })}/><span className="switch-track"/><span>{day.isOnCall ? "On" : "Off"}</span></label></div>
        {day.isOnCall && <div className="oncall-times"><label>On-call starts<input type="time" value={day.onCallStartTime} onChange={e => update(index, { onCallStartTime: e.target.value })}/></label><label>On-call ends<input type="time" value={day.onCallEndTime} onChange={e => update(index, { onCallEndTime: e.target.value })}/></label></div>}
      </section>)}
    </div>}
    <div className="schedule-footnote"><CalendarClock size={16}/><span>These are recurring weekly hours. Date-specific time off, shift exceptions, appointment conflict checks, and Google Calendar sync will be added in later stages. On-call status does not automatically assign emergency appointments.</span></div>
  </div>;
}
