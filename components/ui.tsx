"use client";

import { Check, ChevronDown, Clock3, Phone, X } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="heading-action">{action}</div>}</div>;
}
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { pending_approval: "pending", confirmed: "confirmed", rejected: "rejected", cancelled: "cancelled", completed: "completed", open: "open", in_progress: "progress", resolved: "completed", missed: "missed", answered: "confirmed", "AI handled": "confirmed" };
  const labels: Record<string, string> = { pending_approval: "Pending approval", in_progress: "In progress", AI: "AI handled" };
  return <span className={`status-badge ${map[status] ?? "neutral"}`}><i/>{labels[status] ?? status.replaceAll("_", " ")}</span>;
}
export function Button({ children, variant = "primary", onClick }: { children: ReactNode; variant?: "primary" | "secondary" | "quiet"; onClick?: () => void }) { return <button onClick={onClick} className={`button button-${variant}`}>{children}</button>; }
export function EmptyHint({ children }: { children: ReactNode }) { return <div className="empty-hint">{children}</div>; }
