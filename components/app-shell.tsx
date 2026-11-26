"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CalendarDays, ChevronDown, ClipboardList, LayoutDashboard, PhoneCall, Settings2, Snowflake, Users, Wrench } from "lucide-react";
import type { ReactNode } from "react";

const navigation = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Technicians", href: "/technicians", icon: Wrench },
  { label: "Appointments", href: "/appointments", icon: CalendarDays, count: "3" },
  { label: "Service requests", href: "/service-requests", icon: ClipboardList },
  { label: "Call history", href: "/calls", icon: PhoneCall }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className="app-frame">
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark"><Snowflake size={21} strokeWidth={2.4}/></span><span><strong>northstar</strong><small>HVAC OPERATIONS</small></span></Link>
      <div className="workspace"><div className="workspace-avatar">N</div><div className="workspace-copy"><strong>Northstar Heating & Air</strong><span>Operations workspace</span></div><ChevronDown size={15} className="workspace-chevron"/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="nav-list">{navigation.map(item => { const active = pathname === item.href; const Icon = item.icon; return <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`}><Icon size={18}/><span>{item.label}</span>{item.count && <em>{item.count}</em>}</Link>; })}</nav>
      <div className="sidebar-bottom"><div className="status-card"><span className="status-dot"/><div><strong>AI receptionist online</strong><small>Handling incoming calls</small></div><Activity size={16}/></div><div className="profile"><div className="profile-avatar">JM</div><div><strong>Jordan Miller</strong><span>Business owner</span></div><ChevronDown size={15}/></div></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="breadcrumb">Northstar HVAC <span>/</span> <b>{navigation.find(n => n.href === pathname)?.label ?? "Overview"}</b></div><div className="topbar-right"><span className="demo-pill"><span/> DEMO DATA</span><button className="icon-button" aria-label="Tools"><Settings2 size={18}/></button><div className="topbar-avatar">JM</div></div></header><div className="page-content">{children}</div></main>
  </div>;
}
