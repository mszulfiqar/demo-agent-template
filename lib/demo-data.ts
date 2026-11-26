export type AppointmentStatus = "pending_approval" | "confirmed" | "rejected" | "cancelled" | "completed";
export const technicians = ["Alex Carter", "Marcus Reed", "Sam Wilson"];
export const customers = [
  { id: "CUS-1048", name: "Olivia Bennett", phone: "(555) 201-8842", email: "olivia.bennett@email.com", address: "1842 Willow Creek Dr", city: "Austin, TX", since: "Mar 2024", jobs: 4, spent: "$1,240", initials: "OB", color: "lavender" },
  { id: "CUS-1047", name: "Ethan Parker", phone: "(555) 201-7731", email: "ethan.parker@email.com", address: "92 Ridgeview Ln", city: "Austin, TX", since: "Jun 2023", jobs: 7, spent: "$3,680", initials: "EP", color: "peach" },
  { id: "CUS-1046", name: "Sophia Mitchell", phone: "(555) 201-6620", email: "sophia.m@email.com", address: "410 Lakeway Blvd", city: "Round Rock, TX", since: "Jan 2025", jobs: 2, spent: "$580", initials: "SM", color: "mint" },
  { id: "CUS-1045", name: "Noah Thompson", phone: "(555) 201-5519", email: "noah.t@email.com", address: "77 Cedar Park Way", city: "Cedar Park, TX", since: "Aug 2024", jobs: 3, spent: "$920", initials: "NT", color: "blue" },
  { id: "CUS-1044", name: "Ava Rodriguez", phone: "(555) 201-4408", email: "ava.rodriguez@email.com", address: "2301 Southwood Ave", city: "Austin, TX", since: "Nov 2022", jobs: 9, spent: "$5,410", initials: "AR", color: "pink" }
];
export const appointments = [
  { id: "APT-2084", customer: "Olivia Bennett", phone: "(555) 201-8842", service: "AC not cooling", date: "Today", time: "9:00 AM – 11:00 AM", address: "1842 Willow Creek Dr, Austin", status: "pending_approval" as AppointmentStatus, technician: "", source: "AI receptionist" },
  { id: "APT-2083", customer: "Ethan Parker", phone: "(555) 201-7731", service: "Seasonal maintenance", date: "Today", time: "11:00 AM – 1:00 PM", address: "92 Ridgeview Ln, Austin", status: "confirmed" as AppointmentStatus, technician: "Alex Carter", source: "Phone call" },
  { id: "APT-2082", customer: "Sophia Mitchell", phone: "(555) 201-6620", service: "Thermostat replacement", date: "Today", time: "2:00 PM – 4:00 PM", address: "410 Lakeway Blvd, Round Rock", status: "pending_approval" as AppointmentStatus, technician: "", source: "AI receptionist" },
  { id: "APT-2081", customer: "Noah Thompson", phone: "(555) 201-5519", service: "Furnace inspection", date: "Tomorrow", time: "8:00 AM – 10:00 AM", address: "77 Cedar Park Way, Cedar Park", status: "confirmed" as AppointmentStatus, technician: "Marcus Reed", source: "Web request" },
  { id: "APT-2080", customer: "Ava Rodriguez", phone: "(555) 201-4408", service: "New system estimate", date: "Tomorrow", time: "1:00 PM – 3:00 PM", address: "2301 Southwood Ave, Austin", status: "pending_approval" as AppointmentStatus, technician: "", source: "AI receptionist" },
  { id: "APT-2079", customer: "Liam Foster", phone: "(555) 201-3397", service: "AC making noise", date: "Nov 28", time: "10:00 AM – 12:00 PM", address: "19 Oak Hollow Rd, Austin", status: "completed" as AppointmentStatus, technician: "Sam Wilson", source: "Phone call" }
];
export const requests = [
  { id: "SR-3091", customer: "Olivia Bennett", issue: "Air conditioner not cooling", category: "Repair", priority: "High", created: "Today, 8:42 AM", source: "AI call", status: "open" },
  { id: "SR-3090", customer: "Sophia Mitchell", issue: "Thermostat replacement", category: "Repair", priority: "Normal", created: "Today, 8:16 AM", source: "AI call", status: "open" },
  { id: "SR-3089", customer: "Ava Rodriguez", issue: "Interested in a new AC system", category: "New system estimate", priority: "Normal", created: "Yesterday, 4:32 PM", source: "AI call", status: "in_progress" },
  { id: "SR-3088", customer: "Noah Thompson", issue: "Annual furnace tune-up", category: "Maintenance", priority: "Low", created: "Yesterday, 2:10 PM", source: "Website", status: "resolved" },
  { id: "SR-3087", customer: "Liam Foster", issue: "Outdoor unit making rattling noise", category: "Repair", priority: "Normal", created: "Nov 24, 11:20 AM", source: "Phone call", status: "open" }
];
export const calls = [
  { id: "CALL-5812", customer: "Olivia Bennett", phone: "(555) 201-8842", time: "Today, 8:42 AM", duration: "04:32", outcome: "Appointment requested", result: "answered", summary: "AC is running but not cooling. Customer requested a morning visit." },
  { id: "CALL-5811", customer: "Sophia Mitchell", phone: "(555) 201-6620", time: "Today, 8:16 AM", duration: "03:18", outcome: "Appointment requested", result: "answered", summary: "Customer needs a thermostat replacement and shared preferred availability." },
  { id: "CALL-5810", customer: "Unknown caller", phone: "(555) 201-0912", time: "Today, 7:54 AM", duration: "—", outcome: "Missed call", result: "missed", summary: "Missed inbound call. Automated text-back sent." },
  { id: "CALL-5809", customer: "Ava Rodriguez", phone: "(555) 201-4408", time: "Yesterday, 4:32 PM", duration: "05:06", outcome: "Estimate inquiry", result: "answered", summary: "Asked about replacing an older central AC system." },
  { id: "CALL-5808", customer: "Ethan Parker", phone: "(555) 201-7731", time: "Yesterday, 2:10 PM", duration: "02:44", outcome: "Appointment requested", result: "answered", summary: "Booked a seasonal maintenance request for owner review." }
];
