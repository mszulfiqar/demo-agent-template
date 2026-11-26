import Link from "next/link";
import { ArrowUpRight, CalendarCheck, CalendarClock, PhoneCall, Plus, Users, Wrench, Clock3, ArrowRight, Sparkles } from "lucide-react";
import { appointments, calls, requests } from "@/lib/demo-data";
import { PageHeading, StatusBadge } from "@/components/ui";

export default function DashboardPage() {
  const pending = appointments.filter(a => a.status === "pending_approval");
  return <div>
    <PageHeading eyebrow="THURSDAY, NOVEMBER 26, 2026" title="Good morning, Jordan 👋" description="Here’s what’s happening with your business today." action={<Link className="button button-primary" href="/appointments"><Plus size={17}/> Review requests</Link>} />
    <section className="metric-grid">
      <div className="metric-card"><div className="metric-top"><span>Calls today</span><span className="metric-icon blue"><PhoneCall size={18}/></span></div><div className="metric-value">24</div><div className="metric-foot"><span className="trend-up">↑ 12%</span> <span>vs. yesterday</span></div><div className="sparkline"><i style={{height:"34%"}}/><i style={{height:"48%"}}/><i style={{height:"40%"}}/><i style={{height:"66%"}}/><i style={{height:"54%"}}/><i style={{height:"80%"}}/><i style={{height:"68%"}}/><i style={{height:"100%"}}/></div></div>
      <div className="metric-card"><div className="metric-top"><span>Appointments</span><span className="metric-icon teal"><CalendarCheck size={18}/></span></div><div className="metric-value">08</div><div className="metric-foot"><span className="trend-up">6 confirmed</span><span> · 2 need review</span></div><div className="metric-progress"><span style={{width:"75%"}}/></div><div className="metric-caption">75% confirmed</div></div>
      <div className="metric-card"><div className="metric-top"><span>Open service requests</span><span className="metric-icon orange"><Wrench size={18}/></span></div><div className="metric-value">12</div><div className="metric-foot"><span className="trend-warn">4 high priority</span><span> need attention</span></div><div className="mini-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div>
      <div className="metric-card"><div className="metric-top"><span>New customers</span><span className="metric-icon purple"><Users size={18}/></span></div><div className="metric-value">05</div><div className="metric-foot"><span className="trend-up">↑ 2 new</span><span> this week</span></div><div className="metric-caption">AI receptionist captured 5 leads</div></div>
    </section>
    <div className="dashboard-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Needs your approval</h2><p>Review requests before they’re confirmed</p></div><Link href="/appointments" className="text-link">View all <ArrowRight size={15}/></Link></div>
        <div className="approval-list">{pending.map((a,i)=><div className="approval-row" key={a.id}><div className={`request-icon ${i===0?"warm":"cool"}`}><CalendarClock size={19}/></div><div className="approval-info"><strong>{a.customer}</strong><span>{a.service} · {a.date}, {a.time}</span><small>{a.id} · via {a.source}</small></div><StatusBadge status={a.status}/></div>)}</div>
        <div className="panel-footer"><Link href="/appointments">Review all pending appointments <ArrowRight size={15}/></Link></div>
      </section>
      <section className="panel"><div className="panel-heading"><div><h2>Today’s schedule</h2><p>Your confirmed appointments</p></div><Link href="/appointments" className="text-link">Calendar <ArrowUpRight size={15}/></Link></div>
        <div className="schedule-list">{appointments.filter(a=>a.date==="Today"&&a.status==="confirmed").map(a=><div className="schedule-row" key={a.id}><div className="schedule-time">{a.time.split(" – ")[0]}<span>{a.time.split(" – ")[1]}</span></div><div className="schedule-line"/><div className="schedule-details"><strong>{a.customer}</strong><span>{a.service}</span><small><Wrench size={12}/> {a.technician}</small></div></div>)}<div className="schedule-empty"><Clock3 size={15}/> 2 more appointments awaiting approval</div></div>
      </section>
    </div>
    <div className="dashboard-grid lower-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Recent calls</h2><p>Latest conversations with your AI receptionist</p></div><Link href="/calls" className="text-link">Call history <ArrowRight size={15}/></Link></div>
        <div className="compact-list">{calls.slice(0,3).map(c=><div className="compact-row" key={c.id}><div className={`call-dot ${c.result}`}><PhoneCall size={15}/></div><div className="compact-main"><strong>{c.customer}</strong><span>{c.outcome}</span></div><div className="compact-time">{c.time.replace("Today, ","")}</div></div>)}</div>
      </section>
      <section className="insight-card"><div className="insight-icon"><Sparkles size={19}/></div><div className="eyebrow">AI RECEPTIONIST INSIGHT</div><h2>You didn’t miss a lead.</h2><p>Your AI receptionist answered 18 calls and sent text-backs for 2 missed calls today.</p><div className="insight-stats"><div><strong>18</strong><span>Answered</span></div><div><strong>2</strong><span>Text-backs</span></div><div><strong>5</strong><span>Requests created</span></div></div></section>
    </div>
    <div className="demo-note"><span className="demo-note-dot"/> This dashboard uses sample data. Actions are local demo interactions only.</div>
  </div>;
}
