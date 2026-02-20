import { useState, useEffect } from "react";

// ─── DATA ───────────────────────────────────────────────────────────────────
const INDIAN_HOLIDAYS_2025 = [
  { date: "2025-01-14", name: "Pongal / Makar Sankranti", type: "national" },
  { date: "2025-01-26", name: "Republic Day", type: "national" },
  { date: "2025-03-14", name: "Holi", type: "national" },
  { date: "2025-04-06", name: "Ugadi / Gudi Padwa", type: "regional" },
  { date: "2025-04-10", name: "Mahavir Jayanti", type: "national" },
  { date: "2025-04-14", name: "Tamil New Year / Ambedkar Jayanti", type: "regional" },
  { date: "2025-04-18", name: "Good Friday", type: "national" },
  { date: "2025-05-01", name: "May Day", type: "national" },
  { date: "2025-05-12", name: "Buddha Purnima", type: "national" },
  { date: "2025-06-27", name: "Eid al-Adha", type: "national" },
  { date: "2025-07-27", name: "Muharram", type: "national" },
  { date: "2025-08-15", name: "Independence Day", type: "national" },
  { date: "2025-08-16", name: "Janmashtami", type: "national" },
  { date: "2025-09-05", name: "Vinayaka Chaturthi", type: "regional" },
  { date: "2025-09-25", name: "Milad-un-Nabi", type: "national" },
  { date: "2025-10-02", name: "Gandhi Jayanti / Navratri", type: "national" },
  { date: "2025-10-20", name: "Dussehra / Vijaya Dashami", type: "national" },
  { date: "2025-10-21", name: "Diwali (Day 1)", type: "national" },
  { date: "2025-10-22", name: "Diwali (Day 2)", type: "national" },
  { date: "2025-11-05", name: "Guru Nanak Jayanti", type: "national" },
  { date: "2025-12-25", name: "Christmas", type: "national" },
];

const US_HOLIDAYS_2025 = [
  { date: "2025-01-01", name: "New Year's Day" },
  { date: "2025-01-20", name: "MLK Jr. Day" },
  { date: "2025-02-17", name: "Presidents' Day" },
  { date: "2025-05-26", name: "Memorial Day" },
  { date: "2025-07-04", name: "Independence Day" },
  { date: "2025-09-01", name: "Labor Day" },
  { date: "2025-11-27", name: "Thanksgiving" },
  { date: "2025-11-28", name: "Thanksgiving Friday" },
  { date: "2025-12-25", name: "Christmas" },
];

const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const weekDates = ["Feb 10", "Feb 11", "Feb 12", "Feb 13", "Feb 14", "Feb 15", "Feb 16"];
const weekISO = ["2025-02-10", "2025-02-11", "2025-02-12", "2025-02-13", "2025-02-14", "2025-02-15", "2025-02-16"];

const initialEntries = [
  { day: 0, startTime: "18:30", endTime: "03:00", hours: 8.0, overtime: 0, breakMins: 30, commits: 4, task: "API integration – Payment gateway module", blocker: "", project: "PayScale Finance", leaveType: "" },
  { day: 1, startTime: "18:30", endTime: "03:00", hours: 8.0, overtime: 0, breakMins: 30, commits: 6, task: "Unit tests for auth module – 90% coverage", blocker: "", project: "PayScale Finance", leaveType: "" },
  { day: 2, startTime: "19:00", endTime: "03:30", hours: 8.0, overtime: 0.5, breakMins: 0, commits: 3, task: "Bug fixes – Dashboard charts rendering issue", blocker: "Waiting on design specs from client", project: "PayScale Finance", leaveType: "" },
  { day: 3, startTime: "18:30", endTime: "02:00", hours: 7.0, overtime: 0, breakMins: 30, commits: 5, task: "Code review & PR merge – Auth module", blocker: "", project: "PayScale Finance", leaveType: "" },
  { day: 4, startTime: "18:00", endTime: "03:30", hours: 8.0, overtime: 1.0, breakMins: 0, commits: 2, task: "Sprint planning + DB migration scripts", blocker: "", project: "PayScale Finance", leaveType: "" },
  { day: 5, startTime: "", endTime: "", hours: 0, overtime: 0, breakMins: 0, commits: 0, task: "", blocker: "", project: "", leaveType: "" },
  { day: 6, startTime: "", endTime: "", hours: 0, overtime: 0, breakMins: 0, commits: 0, task: "", blocker: "", project: "", leaveType: "" },
];

const monthlyWeeks = [
  { week: "Feb 3–9", regular: 40, overtime: 1.5, status: "approved", approvedAt: "Feb 10, 9:14 AM EST", leaves: 0 },
  { week: "Feb 10–16", regular: 39, overtime: 1.5, status: "submitted", approvedAt: null, leaves: 0 },
  { week: "Feb 17–23", regular: 0, overtime: 0, status: "upcoming", approvedAt: null, leaves: 0 },
  { week: "Feb 24–28", regular: 0, overtime: 0, status: "upcoming", approvedAt: null, leaves: 0 },
];

const allTalents = [
  { id: 1, name: "Priya Venkatesh", tier: 1, score: 92, role: "Full-Stack Engineer", client: "PayScale Finance", project: "Core API", thisWeek: 40, contracted: 40, status: "approved" },
  { id: 2, name: "Arjun Krishnamurthy", tier: 1, score: 88, role: "Backend Engineer", client: "TechFlow AI", project: "ML Pipeline", thisWeek: 38, contracted: 40, status: "submitted" },
  { id: 3, name: "Kavitha Rajan", tier: 2, score: 76, role: "Frontend Engineer", client: "MedConnect", project: "Patient Portal", thisWeek: 0, contracted: 40, status: "pending" },
  { id: 4, name: "Deepak Suresh", tier: 1, score: 85, role: "DevOps Engineer", client: "MedConnect", project: "Infra", thisWeek: 42, contracted: 40, status: "approved" },
  { id: 5, name: "Meera Nair", tier: 2, score: 74, role: "QA Engineer", client: "EduSpark", project: "Test Suite", thisWeek: 0, contracted: 20, status: "pending" },
];

const auditLog = [
  { time: "Feb 16, 11:30 PM IST", user: "Priya V.", action: "Submitted timesheet", detail: "Week Feb 10–16 · 39h regular + 1.5h OT" },
  { time: "Feb 16, 11:28 PM IST", user: "Priya V.", action: "Edited entry", detail: "Friday: hours 7.5h → 8h, added overtime 1h" },
  { time: "Feb 15, 10:00 PM IST", user: "Arjun K.", action: "Submitted timesheet", detail: "Week Feb 10–16 · 38h regular" },
  { time: "Feb 15, 9:14 AM EST", user: "John (Acme)", action: "Approved timesheet", detail: "Week Feb 3–9 · Priya V. approved" },
  { time: "Feb 14, 8:00 AM EST", user: "System", action: "Auto-approval triggered", detail: "72h SLA expired · Arjun K. Week Feb 3–9 auto-approved" },
  { time: "Feb 13, 11:00 PM IST", user: "Kavitha R.", action: "Submitted timesheet", detail: "Week Feb 3–9 · 38h regular" },
  { time: "Feb 10, 9:14 AM EST", user: "John (Acme)", action: "Approved timesheet", detail: "Week Feb 3–9 · Arjun K. approved" },
];

const disputes = [
  { id: 1, talent: "Kavitha R.", client: "MedConnect", week: "Feb 3–9", issue: "Client disputes 4h on Wednesday – says work wasn't delivered", status: "open", raiser: "Client", raisedAt: "Feb 12, 3:00 PM EST" },
];

const LEAVE_TYPES = ["Sick Leave", "Personal Leave", "Planned PTO", "Worked on Holiday"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function formatIST(t: string) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"} IST`;
}

function tzConvert(t: string, tz: string) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const off = tz === "EST" ? -10 : tz === "PST" ? -13 : -11;
  let nh = h + off;
  if (nh < 0) nh += 24;
  return `${nh % 12 || 12}:${String(m).padStart(2, "0")} ${nh >= 12 ? "PM" : "AM"} ${tz}`;
}

function getIndianHoliday(iso: string) {
  return INDIAN_HOLIDAYS_2025.find(h => h.date === iso);
}

function getUSHoliday(iso: string) {
  return US_HOLIDAYS_2025.find(h => h.date === iso);
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function ViraWorkXTimesheetV3() {
  const [view, setView] = useState<"talent" | "client" | "admin">("talent");
  const [tab, setTab] = useState("weekly");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [status, setStatus] = useState<"pending" | "submitted" | "approved" | "revision">("pending");
  const [entries, setEntries] = useState(initialEntries);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [clientNotes, setClientNotes] = useState<Record<number, string>>({});
  const [dayFlags, setDayFlags] = useState<Record<number, boolean>>({});
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [clientTZ, setClientTZ] = useState("EST");
  const [showExport, setShowExport] = useState(false);
  const [exportNotice, setExportNotice] = useState("");
  const [istTime, setIstTime] = useState("");
  const [usTime, setUsTime] = useState("");
  const [showHolidayCal, setShowHolidayCal] = useState(false);
  const [holFilter, setHolFilter] = useState("all");
  const [disputeText, setDisputeText] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const autoApprovalHrs = 72;
  const [adminFilter, setAdminFilter] = useState("all");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const tzMap: Record<string, string> = { EST: "America/New_York", PST: "America/Los_Angeles", CST: "America/Chicago" };
      const us = new Date(now.toLocaleString("en-US", { timeZone: tzMap[clientTZ] || "America/New_York" }));
      const fmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      setIstTime(fmt(ist));
      setUsTime(fmt(us));
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [clientTZ]);

  // Reset tab when view changes
  useEffect(() => {
    setTab(view === "admin" ? "dashboard" : "weekly");
  }, [view]);

  const totalHours = entries.reduce((s, e) => s + e.hours + e.overtime, 0);
  const totalRegular = entries.reduce((s, e) => s + e.hours, 0);
  const totalOvertime = entries.reduce((s, e) => s + e.overtime, 0);
  const workDays = entries.filter(e => e.hours > 0).length;
  const totalCommits = entries.reduce((s, e) => s + e.commits, 0);
  const contractedHrs = 40;
  const utilization = contractedHrs > 0 ? ((totalRegular / contractedHrs) * 100).toFixed(0) : "0";

  const handleSubmit = () => { setStatus("submitted"); setShowSubmitConfirm(false); };
  const handleApprove = () => setStatus("approved");
  const handleRevision = () => setStatus("revision");

  const sc = {
    pending: { label: "Draft", color: "#94a3b8", icon: "✎" },
    submitted: { label: "Submitted", color: "#f59e0b", icon: "◷" },
    approved: { label: "Approved", color: "#10b981", icon: "✓" },
    revision: { label: "Revision Req.", color: "#ef4444", icon: "!" },
  }[status];

  const handleExport = (type: string) => {
    setShowExport(false);
    setExportNotice(`${type} generated — download starting...`);
    setTimeout(() => setExportNotice(""), 3000);
  };

  const handleEditSave = () => {
    const u = [...entries];
    u[editingDay!] = { ...editForm };
    setEntries(u);
    setEditingDay(null);
  };

  // ─── STYLES ────────────────────────────────────────────────────────────────
  const card = (extra: any = {}) => ({
    background: "#110f28", borderRadius: 12, border: "1px solid #1e1c3a", ...extra
  });
  const txt = (color = "#e2e0f0", size = 12, weight = 400) => ({
    color, fontSize: size, fontWeight: weight
  });
  const mono = { fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ minHeight: "100vh", background: "#08071a", fontFamily: "'Outfit','Segoe UI',sans-serif", color: "#e2e0f0", padding: "16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #2a2850; border-radius: 4px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
        .fade { animation: fadeUp .25s ease; }
        .pulse { animation: pulse 2s infinite; }
        button { transition: all .12s; font-family: inherit; cursor: pointer; }
        button:hover { filter: brightness(1.12); }
        input, textarea, select { font-family: inherit; }
        input:focus, textarea:focus, select:focus { outline: none; border-color: #7c3aed !important; }
      `}</style>

      <div style={{ maxWidth: 1060, margin: "0 auto" }}>

        {/* ═══ TOP BAR ═══ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#7c3aed,#6d28d9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⏱</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-.02em" }}>ViraWorkX Timesheet</div>
              <div style={{ fontSize: 9, color: "#6a679a", letterSpacing: ".1em", textTransform: "uppercase" }}>India–US Talent Operations</div>
            </div>
          </div>

          {/* Live Clocks */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "6px 14px", borderRadius: 10, background: "#110f28", border: "1px solid #1e1c3a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 13 }}>🇮🇳</span>
              <span style={{ color: "#a78bfa", ...mono, fontWeight: 600, fontSize: 13 }}>{istTime}</span>
              <span style={{ color: "#4a4868", fontSize: 10 }}>IST</span>
            </div>
            <div style={{ width: 1, height: 14, background: "#1e1c3a" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 13 }}>🇺🇸</span>
              <span style={{ color: "#60a5fa", ...mono, fontWeight: 600, fontSize: 13 }}>{usTime}</span>
              <select value={clientTZ} onChange={e => setClientTZ(e.target.value)} style={{ background: "transparent", border: "none", color: "#60a5fa", fontSize: 10, cursor: "pointer" }}>
                <option value="EST" style={{ background: "#110f28" }}>EST</option>
                <option value="PST" style={{ background: "#110f28" }}>PST</option>
                <option value="CST" style={{ background: "#110f28" }}>CST</option>
              </select>
            </div>
            <div className="pulse" style={{ width: 5, height: 5, borderRadius: 3, background: "#10b981" }} />
          </div>

          {/* View Switcher */}
          <div style={{ display: "flex", background: "#110f28", borderRadius: 9, padding: 2, border: "1px solid #1e1c3a" }}>
            {[{ id: "talent", icon: "👨‍💻", label: "Talent" }, { id: "client", icon: "🏢", label: "Client" }, { id: "admin", icon: "⚡", label: "Admin" }].map(v => (
              <button key={v.id} onClick={() => setView(v.id as any)} style={{
                padding: "6px 14px", borderRadius: 7, border: "none", fontSize: 11, fontWeight: 600,
                background: view === v.id ? "linear-gradient(135deg,#7c3aed,#6d28d9)" : "transparent",
                color: view === v.id ? "#fff" : "#6a679a",
              }}>{v.icon} {v.label}</button>
            ))}
          </div>
        </div>

        {/* ═══ CONTEXT CARD ═══ */}
        <div style={{ ...card(), padding: "14px 18px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "#6a679a", marginBottom: 2 }}>Week of</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: "#fff", letterSpacing: "-.02em" }}>Feb 10 – 16, 2025</div>
            {view === "talent" && <div style={{ fontSize: 11, color: "#6a679a", marginTop: 2 }}>Project: PayScale Finance · Contracted 40h/wk</div>}
            {view === "client" && <div style={{ fontSize: 11, color: "#6a679a", marginTop: 2 }}>Talent: Priya Venkatesh · Full-Stack Engineer</div>}
            {view === "admin" && <div style={{ fontSize: 11, color: "#6a679a", marginTop: 2 }}>ViraWorkX Admin · All Talent Overview</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {view !== "admin" && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: sc.color + "12", border: `1px solid ${sc.color}25` }}>
                <span style={{ fontSize: 14 }}>{sc.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: sc.color }}>{sc.label}</span>
              </div>
            )}
            <button onClick={() => setShowHolidayCal(!showHolidayCal)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #1e1c3a", background: showHolidayCal ? "#1e1c3a" : "transparent", color: "#a09dc0", fontSize: 11 }}>
              🗓 Holidays
            </button>
          </div>
        </div>

        {/* ═══ HOLIDAY CALENDAR PANEL ═══ */}
        {showHolidayCal && (
          <div className="fade" style={{ ...card(), padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>🇮🇳 Indian Holidays 2025</div>
              <div style={{ display: "flex", gap: 4 }}>
                {["all", "national", "regional"].map(f => (
                  <button key={f} onClick={() => setHolFilter(f)} style={{
                    padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 10, fontWeight: 600,
                    background: holFilter === f ? "#7c3aed" : "transparent", color: holFilter === f ? "#fff" : "#6a679a",
                  }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 6, marginBottom: 12 }}>
              {INDIAN_HOLIDAYS_2025.filter(h => holFilter === "all" || h.type === holFilter).map((h, i) => {
                const isPast = new Date(h.date) < new Date("2025-02-17");
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "#0c0a1a", opacity: isPast ? 0.5 : 1 }}>
                    <div style={{ width: 36, textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "#6a679a", textTransform: "uppercase" }}>{new Date(h.date + "T12:00:00").toLocaleDateString("en", { month: "short" })}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#a78bfa" }}>{new Date(h.date + "T12:00:00").getDate()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#d4d0f0" }}>{h.name}</div>
                      <div style={{ fontSize: 9, color: h.type === "national" ? "#fbbf24" : "#7c7a96" }}>{h.type}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {view !== "talent" && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "#0c0a1a", border: "1px solid #1e1c3a" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#60a5fa", marginBottom: 6 }}>🇺🇸 US Federal Holidays</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {US_HOLIDAYS_2025.map((h, i) => (
                    <span key={i} style={{ padding: "3px 8px", borderRadius: 5, background: "#3b82f615", border: "1px solid #3b82f625", fontSize: 10, color: "#93c5fd" }}>
                      {new Date(h.date + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })} · {h.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB NAV ═══ */}
        <div style={{ display: "flex", gap: 2, marginBottom: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          {(view === "admin"
            ? [{ id: "dashboard", l: "⚡ All Timesheets" }, { id: "audit", l: "📋 Audit Log" }, { id: "disputes", l: "⚖️ Disputes" }]
            : [{ id: "weekly", l: "📅 Weekly" }, { id: "monthly", l: "📊 Monthly" }, { id: "leaves", l: "🌴 Leaves" }, { id: "billing", l: "💰 Billing" }]
          ).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "8px 16px", borderRadius: "9px 9px 3px 3px", border: "1px solid #1e1c3a",
              borderBottom: tab === t.id ? "1px solid #110f28" : "1px solid #1e1c3a",
              fontSize: 11, fontWeight: 600,
              background: tab === t.id ? "#110f28" : "transparent",
              color: tab === t.id ? "#d4d0f0" : "#4a4868",
            }}>{t.l}</button>
          ))}
          <div style={{ flex: 1 }} />
          {view !== "admin" && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowExport(!showExport)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #1e1c3a", background: "transparent", color: "#a09dc0", fontSize: 11 }}>
                ↓ Export
              </button>
              {showExport && (
                <div className="fade" style={{ position: "absolute", top: 38, right: 0, width: 180, background: "#110f28", border: "1px solid #1e1c3a", borderRadius: 10, padding: 6, zIndex: 50 }}>
                  {["PDF Report", "CSV Data", "Email to Client", "Invoice (PDF)"].map(o => (
                    <button key={o} onClick={() => handleExport(o)} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", color: "#c4c1e0", fontSize: 12, textAlign: "left", borderRadius: 6 }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#1e1c3a")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {exportNotice && <div className="fade" style={{ padding: "9px 16px", borderRadius: 9, marginBottom: 10, background: "#10b98115", border: "1px solid #10b98125", color: "#6ee7b7", fontSize: 12 }}>{exportNotice}</div>}

        {/* ══════════════════════════════════════════════════════
            ADMIN DASHBOARD
        ══════════════════════════════════════════════════════ */}
        {view === "admin" && tab === "dashboard" && (
          <div className="fade">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 9, marginBottom: 14 }}>
              {[
                { l: "Total Talents", v: allTalents.length, s: "active", c: "#a78bfa" },
                { l: "Submitted", v: allTalents.filter(t => t.status === "submitted").length, s: "awaiting review", c: "#f59e0b" },
                { l: "Approved", v: allTalents.filter(t => t.status === "approved").length, s: "this week", c: "#10b981" },
                { l: "Pending", v: allTalents.filter(t => t.status === "pending").length, s: "not submitted", c: "#ef4444" },
                { l: "Open Disputes", v: disputes.filter(d => d.status === "open").length, s: "need mediation", c: "#f472b6" },
              ].map((c, i) => (
                <div key={i} style={{ ...card(), padding: "13px 15px" }}>
                  <div style={{ fontSize: 9, color: "#6a679a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>{c.l}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: c.c, ...mono }}>{c.v}</div>
                  <div style={{ fontSize: 9, color: "#3d3b5a" }}>{c.s}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              {["all", "pending", "submitted", "approved"].map(f => (
                <button key={f} onClick={() => setAdminFilter(f)} style={{
                  padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 10, fontWeight: 600,
                  background: adminFilter === f ? "#7c3aed" : "#110f28", color: adminFilter === f ? "#fff" : "#6a679a",
                }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
              ))}
            </div>
            <div style={{ ...card(), overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 100px 100px 80px 80px 120px", padding: "10px 16px", background: "#13102e", borderBottom: "1px solid #1e1c3a", fontSize: 10, color: "#4a4868", fontWeight: 600 }}>
                <div></div><div>Talent</div><div>Client</div><div>Project</div><div style={{ textAlign: "center" }}>Hours</div><div style={{ textAlign: "center" }}>Util.</div><div style={{ textAlign: "center" }}>Status</div>
              </div>
              {allTalents.filter(t => adminFilter === "all" || t.status === adminFilter).map(t => {
                const util = t.contracted > 0 ? ((t.thisWeek / t.contracted) * 100).toFixed(0) : "0";
                const utilColor = Number(util) >= 90 ? "#10b981" : Number(util) >= 70 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={t.id} style={{ display: "grid", gridTemplateColumns: "50px 1fr 100px 100px 80px 80px 120px", padding: "12px 16px", borderBottom: "1px solid #12102a", alignItems: "center" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1e1c3a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>
                      {t.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e0f0" }}>{t.name}</div>
                      <div style={{ fontSize: 10, color: "#6a679a" }}>{t.role} · Tier {t.tier} <span style={{ color: t.tier === 1 ? "#10b981" : t.tier === 2 ? "#f59e0b" : "#ef4444" }}>●</span></div>
                    </div>
                    <div style={{ fontSize: 11, color: "#a09dc0" }}>{t.client}</div>
                    <div style={{ fontSize: 11, color: "#8a87b0" }}>{t.project}</div>
                    <div style={{ textAlign: "center", fontSize: 12, color: "#d4d0f0", ...mono }}>{t.thisWeek}h</div>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ padding: "3px 8px", borderRadius: 5, background: utilColor + "15", color: utilColor, fontSize: 10, fontWeight: 600 }}>{util}%</span>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <span style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                        background: t.status === "approved" ? "#10b98115" : t.status === "submitted" ? "#f59e0b15" : "#ef444415",
                        color: t.status === "approved" ? "#10b981" : t.status === "submitted" ? "#f59e0b" : "#ef4444",
                        border: `1px solid ${t.status === "approved" ? "#10b98125" : t.status === "submitted" ? "#f59e0b25" : "#ef444425"}`,
                      }}>
                        {t.status === "pending" ? "⚠ Not Submitted" : t.status === "submitted" ? "◷ Awaiting" : "✓ Approved"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "12px 18px", borderRadius: 10, background: "#13102e", border: "1px solid #f59e0b25", marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#f59e0b", marginBottom: 4 }}>⏱ Auto-Approval SLA</div>
              <div style={{ fontSize: 11, color: "#8a87b0" }}>If a client doesn't approve or request revision within {autoApprovalHrs}h of submission, the timesheet is auto-approved and billing proceeds.</div>
            </div>
            {allTalents.filter(t => t.status === "pending" && t.contracted > 0).length > 0 && (
              <div style={{ padding: "12px 18px", borderRadius: 10, background: "#1a0f18", border: "1px solid #ef444425", marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#ef4444", marginBottom: 6 }}>⚠ Late Submissions</div>
                {allTalents.filter(t => t.status === "pending" && t.contracted > 0).map(t => (
                  <div key={t.id} style={{ fontSize: 11, color: "#d4a0b0", marginBottom: 3 }}>
                    • <strong>{t.name}</strong> ({t.client} / {t.project}) — hasn't submitted this week
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ ADMIN AUDIT LOG ═══ */}
        {view === "admin" && tab === "audit" && (
          <div className="fade" style={{ ...card(), overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", background: "#13102e", borderBottom: "1px solid #1e1c3a" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Audit Log — All Timesheets</div>
              <div style={{ fontSize: 10, color: "#6a679a", marginTop: 2 }}>Every edit, submission, approval and auto-action is recorded.</div>
            </div>
            {auditLog.map((l, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "180px 120px 160px 1fr", gap: 10, padding: "12px 18px", borderBottom: "1px solid #12102a", fontSize: 11 }}>
                <div style={{ color: "#6a679a", ...mono, fontSize: 10 }}>{l.time}</div>
                <div style={{ color: l.user === "System" ? "#f59e0b" : "#a78bfa", fontWeight: 500 }}>{l.user}</div>
                <div style={{ color: "#d4d0f0" }}>{l.action}</div>
                <div style={{ color: "#8a87b0" }}>{l.detail}</div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ ADMIN DISPUTES ═══ */}
        {view === "admin" && tab === "disputes" && (
          <div className="fade">
            <div style={{ ...card(), overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", background: "#13102e", borderBottom: "1px solid #1e1c3a" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Dispute Resolution</div>
                <div style={{ fontSize: 10, color: "#6a679a", marginTop: 2 }}>ViraWorkX mediates billing disputes between clients and talent.</div>
              </div>
              {disputes.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "#3d3b5a", fontSize: 13 }}>No open disputes ✓</div>
              ) : disputes.map(d => (
                <div key={d.id} style={{ padding: 16, borderBottom: "1px solid #141230" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e0f0" }}>{d.talent}</span>
                      <span style={{ color: "#6a679a", fontSize: 11 }}> ↔ {d.client}</span>
                      <span style={{ color: "#4a4868", fontSize: 10, marginLeft: 8 }}>Week: {d.week}</span>
                    </div>
                    <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: d.status === "open" ? "#ef444415" : "#10b98115", color: d.status === "open" ? "#ef4444" : "#10b981" }}>
                      {d.status === "open" ? "🔴 Open" : "✓ Resolved"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#a09dc0", marginBottom: 8, padding: "8px 12px", background: "#0c0a1a", borderRadius: 8 }}>{d.issue}</div>
                  <div style={{ fontSize: 10, color: "#6a679a" }}>Raised by: {d.raiser} · {d.raisedAt}</div>
                  {d.status === "open" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #10b98125", background: "#10b98115", color: "#10b981", fontSize: 11 }}>✓ Resolve in Talent's Favor</button>
                      <button style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #3b82f625", background: "#3b82f615", color: "#60a5fa", fontSize: 11 }}>✓ Resolve in Client's Favor</button>
                      <button style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #f59e0b25", background: "#f59e0b15", color: "#f59e0b", fontSize: 11 }}>🤝 Split Decision</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            WEEKLY TIMESHEET (Talent & Client)
        ══════════════════════════════════════════════════════ */}
        {view !== "admin" && tab === "weekly" && (
          <>
            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: 12 }}>
              {[
                { l: "Total", v: totalHours.toFixed(1), s: "hours", c: "#a78bfa" },
                { l: "Regular", v: totalRegular.toFixed(1), s: "billable", c: "#6ee7b7" },
                { l: "Overtime", v: totalOvertime.toFixed(1), s: "extra", c: "#fbbf24" },
                { l: "Work Days", v: workDays, s: "of 5", c: "#60a5fa" },
                { l: "Utilization", v: `${utilization}%`, s: `of ${contractedHrs}h`, c: Number(utilization) >= 90 ? "#10b981" : Number(utilization) >= 75 ? "#f59e0b" : "#ef4444" },
                { l: "Commits", v: totalCommits, s: "this week", c: "#f472b6" },
              ].map((c, i) => (
                <div key={i} style={{ ...card(), padding: "12px 14px" }}>
                  <div style={{ fontSize: 9, color: "#6a679a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>{c.l}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: c.c, ...mono }}>{c.v}</div>
                  <div style={{ fontSize: 9, color: "#3d3b5a" }}>{c.s}</div>
                </div>
              ))}
            </div>

            {totalRegular < contractedHrs * 0.75 && totalRegular > 0 && (
              <div style={{ padding: "9px 16px", borderRadius: 9, marginBottom: 12, background: "#f59e0b15", border: "1px solid #f59e0b25", color: "#fbbf24", fontSize: 12 }}>
                ⚠ Hours logged ({totalRegular}h) are below 75% of contracted {contractedHrs}h. Please review.
              </div>
            )}

            {/* Timesheet Grid */}
            <div style={{ ...card(), overflow: "hidden", marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: view === "client" ? "120px 1fr 90px 90px 60px 50px 40px 50px" : "120px 1fr 90px 90px 60px 50px 40px", padding: "10px 16px", background: "#13102e", borderBottom: "1px solid #1e1c3a", fontSize: 10, color: "#4a4868", fontWeight: 600 }}>
                <div>Day</div><div>Task / Blocker</div>
                <div style={{ textAlign: "center" }}>IST</div>
                <div style={{ textAlign: "center" }}>{clientTZ}</div>
                <div style={{ textAlign: "center" }}>Hrs</div>
                <div style={{ textAlign: "center" }}>OT</div>
                <div style={{ textAlign: "center" }}>💻</div>
                {view === "client" && <div style={{ textAlign: "center" }}>Flag</div>}
              </div>

              {entries.map((entry, i) => {
                const isWeekend = i >= 5;
                const holiday = getIndianHoliday(weekISO[i]);
                const usHol = getUSHoliday(weekISO[i]);
                const isFlagged = dayFlags[i];
                const isLeave = entry.leaveType && entry.leaveType !== "Worked on Holiday";
                return (
                  <div key={i}>
                    <div
                      onClick={() => editingDay !== i && setSelectedDay(selectedDay === i ? null : i)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: view === "client" ? "120px 1fr 90px 90px 60px 50px 40px 50px" : "120px 1fr 90px 90px 60px 50px 40px",
                        padding: "11px 16px",
                        borderBottom: i < 6 ? "1px solid #12102a" : "none",
                        background: selectedDay === i ? "#1a1740" : isFlagged ? "#2a1520" : holiday ? "#1a1a0f" : "transparent",
                        cursor: "pointer",
                        opacity: isWeekend && !entry.hours ? 0.3 : 1,
                        alignItems: "center",
                      }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: holiday ? "#fbbf2415" : isLeave ? "#f472b615" : isWeekend ? "#0c0a1a" : "#1e1c3a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: holiday ? "#fbbf24" : isLeave ? "#f472b6" : "#6a679a" }}>{FULL_DAYS[i].slice(0, 3).toUpperCase()}</div>
                          <div style={{ fontSize: 10, color: "#4a4868" }}>{weekDates[i].split(" ")[1]}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 500, color: "#c4c1e0" }}>{FULL_DAYS[i]}</div>
                          <div style={{ fontSize: 9, color: holiday ? "#fbbf24" : usHol ? "#60a5fa" : "#4a4868" }}>
                            {weekDates[i]}{holiday ? ` · ${holiday.name}` : ""}{usHol ? ` 🇺🇸 ${usHol.name}` : ""}
                          </div>
                          {isLeave && <div style={{ fontSize: 8, color: "#f472b6", fontWeight: 600 }}>{entry.leaveType}</div>}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "flex-start", flexDirection: "column", gap: 2 }}>
                        {entry.task ? (
                          <>
                            <div style={{ fontSize: 11, color: "#a09dc0", lineHeight: 1.3 }}>{entry.task}</div>
                            {entry.blocker && <div style={{ fontSize: 9, color: "#ef4444", fontWeight: 500 }}>⚠ {entry.blocker}</div>}
                          </>
                        ) : (
                          <div style={{ fontSize: 10, color: "#3d3b5a", fontStyle: "italic" }}>{isWeekend ? "Weekend" : "No entry"}</div>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                        {entry.startTime ? (
                          <>
                            <div style={{ fontSize: 10, color: "#a78bfa", ...mono }}>{formatIST(entry.startTime)}</div>
                            <div style={{ fontSize: 8, color: "#3d3b5a" }}>to {formatIST(entry.endTime)}</div>
                          </>
                        ) : <span style={{ color: "#2a2850" }}>—</span>}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                        {entry.startTime ? (
                          <>
                            <div style={{ fontSize: 10, color: "#60a5fa", ...mono }}>{tzConvert(entry.startTime, clientTZ)}</div>
                            <div style={{ fontSize: 8, color: "#3d3b5a" }}>to {tzConvert(entry.endTime, clientTZ)}</div>
                          </>
                        ) : <span style={{ color: "#2a2850" }}>—</span>}
                      </div>

                      <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: entry.hours > 0 ? "#d4d0f0" : "#2a2850", ...mono }}>{entry.hours > 0 ? entry.hours.toFixed(1) : "—"}</div>
                      <div style={{ textAlign: "center", fontSize: 12, color: entry.overtime > 0 ? "#fbbf24" : "#2a2850", ...mono }}>{entry.overtime > 0 ? `+${entry.overtime}` : "—"}</div>
                      <div style={{ textAlign: "center", fontSize: 11, color: "#6a679a" }}>{entry.commits > 0 ? entry.commits : "—"}</div>

                      {view === "client" && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {entry.hours > 0 && (
                            <button onClick={e => { e.stopPropagation(); setDayFlags({ ...dayFlags, [i]: !dayFlags[i] }); }} style={{
                              width: 26, height: 26, borderRadius: 6, border: "none",
                              background: isFlagged ? "#ef444428" : "#0c0a1a", color: isFlagged ? "#ef4444" : "#3d3b5a",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
                            }}>⚑</button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Inline Edit Panel (Talent only) */}
                    {editingDay === i && view === "talent" && (
                      <div className="fade" style={{ padding: "14px 16px", background: "#13102e", borderBottom: "1px solid #1e1c3a" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                          {[
                            { l: "Start (IST)", k: "startTime", type: "time" },
                            { l: "End (IST)", k: "endTime", type: "time" },
                            { l: "Hours", k: "hours", type: "number" },
                            { l: "Overtime", k: "overtime", type: "number" },
                            { l: "Break (min)", k: "breakMins", type: "number" },
                            { l: "Commits", k: "commits", type: "number" },
                          ].map(f => (
                            <div key={f.k}>
                              <div style={{ fontSize: 9, color: "#6a679a", marginBottom: 3, textTransform: "uppercase" }}>{f.l}</div>
                              <input type={f.type} value={editForm[f.k] || ""} onChange={e => setEditForm({ ...editForm, [f.k]: f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value })}
                                step={f.type === "number" ? "0.5" : undefined}
                                style={{ width: "100%", padding: "7px 8px", borderRadius: 7, background: "#08071a", border: "1px solid #2a2850", color: "#e2e0f0", fontSize: 12 }} />
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: 9, color: "#6a679a", marginBottom: 3, textTransform: "uppercase" }}>Task Description</div>
                            <textarea value={editForm.task || ""} onChange={e => setEditForm({ ...editForm, task: e.target.value })} rows={2}
                              style={{ width: "100%", padding: "8px 10px", borderRadius: 7, background: "#08071a", border: "1px solid #2a2850", color: "#e2e0f0", fontSize: 12, resize: "none" }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 9, color: "#6a679a", marginBottom: 3, textTransform: "uppercase" }}>Blocker</div>
                            <textarea value={editForm.blocker || ""} onChange={e => setEditForm({ ...editForm, blocker: e.target.value })} rows={2}
                              style={{ width: "100%", padding: "8px 10px", borderRadius: 7, background: "#08071a", border: "1px solid #2a2850", color: "#e2e0f0", fontSize: 12, resize: "none" }} />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <select value={editForm.leaveType || ""} onChange={e => setEditForm({ ...editForm, leaveType: e.target.value })}
                            style={{ padding: "7px 10px", borderRadius: 7, background: "#08071a", border: "1px solid #2a2850", color: "#e2e0f0", fontSize: 12 }}>
                            <option value="">No Leave</option>
                            {LEAVE_TYPES.map(lt => <option key={lt} value={lt}>{lt}</option>)}
                          </select>
                          <div style={{ flex: 1 }} />
                          <button onClick={() => setEditingDay(null)} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #2a2850", background: "transparent", color: "#6a679a", fontSize: 12 }}>Cancel</button>
                          <button onClick={handleEditSave} style={{ padding: "7px 18px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", fontSize: 12, fontWeight: 600 }}>Save</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Day Detail Panel */}
            {selectedDay !== null && entries[selectedDay].hours > 0 && editingDay !== selectedDay && (
              <div className="fade" style={{ ...card(), padding: 18, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{FULL_DAYS[selectedDay]} · {weekDates[selectedDay]}</div>
                    <div style={{ fontSize: 10, color: "#6a679a", marginTop: 2 }}>
                      {entries[selectedDay].project} · {formatIST(entries[selectedDay].startTime)} → {formatIST(entries[selectedDay].endTime)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {view === "talent" && (status === "pending" || status === "revision") && (
                      <button onClick={() => { setEditingDay(selectedDay); setEditForm({ ...entries[selectedDay] }); }} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #2a2850", background: "transparent", color: "#a09dc0", fontSize: 11 }}>✎ Edit</button>
                    )}
                    <div style={{ padding: "5px 10px", borderRadius: 6, background: "#7c3aed12", border: "1px solid #7c3aed25", color: "#a78bfa", fontSize: 13, ...mono, fontWeight: 700 }}>
                      {(entries[selectedDay].hours + entries[selectedDay].overtime).toFixed(1)}h
                    </div>
                  </div>
                </div>
                <div style={{ background: "#0c0a1a", borderRadius: 8, padding: 12, border: "1px solid #1e1c3a", marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: "#6a679a", textTransform: "uppercase", marginBottom: 6 }}>Task</div>
                  <div style={{ fontSize: 11, color: "#c4c1e0", lineHeight: 1.5 }}>{entries[selectedDay].task}</div>
                </div>
                {entries[selectedDay].blocker && (
                  <div style={{ background: "#1a0f18", borderRadius: 8, padding: 10, border: "1px solid #ef444425", marginBottom: 8 }}>
                    <div style={{ fontSize: 9, color: "#ef4444", textTransform: "uppercase", marginBottom: 4 }}>⚠ Blocker</div>
                    <div style={{ fontSize: 11, color: "#d4a0b0" }}>{entries[selectedDay].blocker}</div>
                  </div>
                )}
                {view === "client" && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 9, color: "#6a679a", textTransform: "uppercase", marginBottom: 6 }}>Client Note</div>
                    <textarea value={clientNotes[selectedDay] || ""} onChange={e => setClientNotes({ ...clientNotes, [selectedDay]: e.target.value })}
                      placeholder="Add a note or question..." rows={2}
                      style={{ width: "100%", background: "#08071a", border: "1px solid #2a2850", borderRadius: 8, color: "#e2e0f0", padding: "8px 12px", fontSize: 12, resize: "none" }} />
                  </div>
                )}
                {view === "talent" && clientNotes[selectedDay] && (
                  <div style={{ marginTop: 10, background: "#1a1520", borderRadius: 8, padding: 10, border: "1px solid #f59e0b25" }}>
                    <div style={{ fontSize: 9, color: "#f59e0b", textTransform: "uppercase", marginBottom: 4 }}>Client Note</div>
                    <div style={{ fontSize: 11, color: "#e2e0f0" }}>{clientNotes[selectedDay]}</div>
                  </div>
                )}
              </div>
            )}

            {/* Dispute Button (Client) */}
            {view === "client" && status === "submitted" && (
              <div style={{ marginBottom: 14 }}>
                {!showDispute ? (
                  <button onClick={() => setShowDispute(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #f472b625", background: "#f472b615", color: "#f472b6", fontSize: 12 }}>
                    ⚖️ Raise Dispute (ViraWorkX Mediates)
                  </button>
                ) : (
                  <div className="fade" style={{ ...card(), padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#f472b6", marginBottom: 8 }}>⚖️ Dispute Details</div>
                    <textarea value={disputeText} onChange={e => setDisputeText(e.target.value)}
                      placeholder="Describe the issue. ViraWorkX will mediate within 24h." rows={3}
                      style={{ width: "100%", background: "#08071a", border: "1px solid #2a2850", borderRadius: 8, color: "#e2e0f0", padding: "8px 12px", fontSize: 12, resize: "none", marginBottom: 8 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setShowDispute(false)} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #2a2850", background: "transparent", color: "#6a679a", fontSize: 12 }}>Cancel</button>
                      <button onClick={() => { setShowDispute(false); setDisputeText(""); }} style={{ padding: "7px 18px", borderRadius: 7, border: "none", background: "#f472b6", color: "#fff", fontSize: 12, fontWeight: 600 }}>Submit Dispute</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Bar */}
            <div style={{ ...card(), padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {view === "talent" ? (
                <>
                  <div style={{ fontSize: 11, color: "#6a679a" }}>
                    {status === "pending" && "Log hours in IST. Client sees auto-converted times."}
                    {status === "submitted" && "Submitted. Client will review during US business hours."}
                    {status === "approved" && "✓ Approved & locked. Hours are billable."}
                    {status === "revision" && "⚠ Client flagged entries. Review and resubmit."}
                  </div>
                  {(status === "pending" || status === "revision") && (
                    !showSubmitConfirm ? (
                      <button onClick={() => setShowSubmitConfirm(true)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", fontSize: 12, fontWeight: 600 }}>
                        Submit Timesheet →
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setShowSubmitConfirm(false)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #2a2850", background: "transparent", color: "#6a679a", fontSize: 12 }}>Cancel</button>
                        <button onClick={handleSubmit} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#10b981", color: "#fff", fontSize: 12, fontWeight: 600 }}>✓ Confirm Submit</button>
                      </div>
                    )
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 11, color: "#6a679a" }}>
                    {status === "pending" && "Talent hasn't submitted yet."}
                    {status === "submitted" && `Review entries. Auto-approves in ${autoApprovalHrs}h if no action.`}
                    {status === "approved" && "✓ Approved & billable."}
                    {status === "revision" && "Revision requested. Waiting for talent."}
                  </div>
                  {status === "submitted" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={handleRevision} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ef444425", background: "#ef444415", color: "#ef4444", fontSize: 12 }}>Request Revision</button>
                      <button onClick={handleApprove} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#10b981", color: "#fff", fontSize: 12, fontWeight: 600 }}>✓ Approve</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* ═══ MONTHLY TAB ═══ */}
        {view !== "admin" && tab === "monthly" && (
          <div className="fade">
            <div style={{ ...card(), overflow: "hidden" }}>
              <div style={{ padding: "12px 18px", background: "#13102e", borderBottom: "1px solid #1e1c3a" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>February 2025</div>
                <div style={{ fontSize: 11, color: "#6a679a" }}>{view === "talent" ? "Priya Venkatesh · PayScale Finance" : "Talent: Priya Venkatesh"}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 1fr 1fr 80px 120px", padding: "10px 18px", background: "#0c0a1a", borderBottom: "1px solid #1e1c3a", fontSize: 10, color: "#4a4868", fontWeight: 600 }}>
                <div>Week</div><div style={{ textAlign: "center" }}>Regular</div><div style={{ textAlign: "center" }}>Overtime</div><div style={{ textAlign: "center" }}>Total</div><div style={{ textAlign: "center" }}>Leaves</div><div style={{ textAlign: "center" }}>Status</div>
              </div>
              {monthlyWeeks.map((r, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "150px 1fr 1fr 1fr 80px 120px", padding: "12px 18px", borderBottom: "1px solid #12102a", alignItems: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#c4c1e0" }}>{r.week}</div>
                  <div style={{ textAlign: "center", ...mono, fontSize: 13, color: "#d4d0f0" }}>{r.regular > 0 ? `${r.regular}h` : "—"}</div>
                  <div style={{ textAlign: "center", ...mono, fontSize: 13, color: r.overtime > 0 ? "#fbbf24" : "#3d3b5a" }}>{r.overtime > 0 ? `+${r.overtime}h` : "—"}</div>
                  <div style={{ textAlign: "center", ...mono, fontSize: 13, fontWeight: 600, color: "#a78bfa" }}>{r.regular > 0 ? `${(r.regular + r.overtime).toFixed(1)}h` : "—"}</div>
                  <div style={{ textAlign: "center", fontSize: 11, color: "#f472b6" }}>{r.leaves > 0 ? `${r.leaves}d` : "—"}</div>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ padding: "3px 9px", borderRadius: 5, fontSize: 10, fontWeight: 600, background: r.status === "approved" ? "#10b98115" : r.status === "submitted" ? "#f59e0b15" : "#1e1c3a", color: r.status === "approved" ? "#10b981" : r.status === "submitted" ? "#f59e0b" : "#4a4868" }}>
                      {r.status === "approved" ? "✓ Approved" : r.status === "submitted" ? "◷ Pending" : "Upcoming"}
                    </span>
                  </div>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 1fr 1fr 80px 120px", padding: "12px 18px", background: "#13102e" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Month Total</div>
                <div style={{ textAlign: "center", ...mono, fontSize: 13, fontWeight: 700, color: "#6ee7b7" }}>79h</div>
                <div style={{ textAlign: "center", ...mono, fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>+3h</div>
                <div style={{ textAlign: "center", ...mono, fontSize: 14, fontWeight: 700, color: "#a78bfa" }}>82h</div>
                <div style={{ textAlign: "center", fontSize: 11, color: "#f472b6" }}>0d</div>
                <div />
              </div>
            </div>
          </div>
        )}

        {/* ═══ LEAVE / PTO TAB ═══ */}
        {view !== "admin" && tab === "leaves" && (
          <div className="fade">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div style={{ ...card(), padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Leave Balances — 2025</div>
                {[
                  { type: "Sick Leave", used: 2, total: 12, color: "#ef4444" },
                  { type: "Personal Leave", used: 1, total: 6, color: "#f59e0b" },
                  { type: "Planned PTO", used: 3, total: 15, color: "#60a5fa" },
                  { type: "Indian Holidays", used: 1, total: INDIAN_HOLIDAYS_2025.filter(h => h.type === "national").length, color: "#a78bfa" },
                ].map((l, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "#a09dc0" }}>{l.type}</span>
                      <span style={{ fontSize: 11, ...mono, color: l.color }}>{l.used}/{l.total}d</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "#0c0a1a" }}>
                      <div style={{ height: "100%", borderRadius: 3, background: l.color, width: `${(l.used / l.total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ ...card(), padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Upcoming Holidays</div>
                {INDIAN_HOLIDAYS_2025.filter(h => new Date(h.date) >= new Date("2025-02-17")).slice(0, 6).map((h, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "#0c0a1a", marginBottom: 6 }}>
                    <div style={{ width: 40, textAlign: "center" }}>
                      <div style={{ fontSize: 8, color: "#6a679a", textTransform: "uppercase" }}>{new Date(h.date + "T12:00:00").toLocaleDateString("en", { month: "short" })}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24" }}>{new Date(h.date + "T12:00:00").getDate()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#d4d0f0" }}>{h.name}</div>
                      <div style={{ fontSize: 9, color: "#6a679a" }}>{h.type} · {view === "talent" ? "Day off" : "Talent OOO"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 10, color: "#6a679a", padding: "8px 10px", background: "#110f28", borderRadius: 8 }}>
              {view === "talent" ? "To work on a holiday, log hours and select \"Worked on Holiday\" as leave type." : "Talent observes Indian national holidays. US holidays are informational only."}
            </div>
          </div>
        )}

        {/* ═══ BILLING TAB ═══ */}
        {view !== "admin" && tab === "billing" && (
          <div className="fade">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ ...card(), padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
                  {view === "client" ? "Invoice Summary" : "Earnings Summary"}
                </div>
                {view === "client" ? (
                  <>
                    {[
                      { l: "Regular Hours (79h × $45/hr)", v: "$3,555.00", c: "#6ee7b7" },
                      { l: "Overtime (3h × $67.50/hr)", v: "$202.50", c: "#fbbf24" },
                    ].map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e1c3a" }}>
                        <span style={{ fontSize: 12, color: "#a09dc0" }}>{r.l}</span>
                        <span style={{ fontSize: 13, ...mono, fontWeight: 600, color: r.c }}>{r.v}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Total Due</span>
                      <span style={{ fontSize: 16, ...mono, fontWeight: 700, color: "#a78bfa" }}>$3,757.50</span>
                    </div>
                    <div style={{ padding: "8px 12px", borderRadius: 7, background: "#0c0a1a", fontSize: 10, color: "#6a679a" }}>Net-15 payment terms · No hidden fees · Rate is all-inclusive</div>
                  </>
                ) : (
                  <>
                    {[
                      { l: "Regular Hours (79h × $45/hr)", v: "$3,555.00", c: "#6ee7b7" },
                      { l: "Overtime (3h × $67.50/hr)", v: "$202.50", c: "#fbbf24" },
                      { l: "Gross Total", v: "$3,757.50", c: "#d4d0f0" },
                      { l: "Platform Fee (10%)", v: "−$375.75", c: "#ef4444" },
                    ].map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e1c3a" }}>
                        <span style={{ fontSize: 12, color: "#a09dc0" }}>{r.l}</span>
                        <span style={{ fontSize: 13, ...mono, fontWeight: 600, color: r.c }}>{r.v}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Your Net Payout</span>
                      <span style={{ fontSize: 16, ...mono, fontWeight: 700, color: "#10b981" }}>$3,381.75</span>
                    </div>
                    <div style={{ padding: "8px 12px", borderRadius: 7, background: "#0c0a1a", fontSize: 10, color: "#6a679a" }}>
                      INR payout via Skydo: ~₹2,82,080 at ₹83.42/USD · FIRA certificate issued
                    </div>
                  </>
                )}
              </div>

              <div style={{ ...card(), padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Payment Flow</div>
                {[
                  { step: "1", l: "Timesheet Approved", d: "Client approves or auto-approved after 72h SLA", done: true },
                  { step: "2", l: "Invoice Generated", d: "Auto-generated from approved timesheet data", done: true },
                  { step: "3", l: "Client Payment", d: "Net-15 terms · 1.5% monthly interest if late", done: false },
                  { step: "4", l: "Talent Payout (−10% fee)", d: "INR via Skydo within 3 biz days of receipt", done: false },
                  { step: "5", l: "FIRA Certificate", d: "Foreign Inward Remittance Advice issued", done: false },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < 4 ? 12 : 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 24, height: 24, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: s.done ? "#10b98120" : "#1e1c3a", border: `1px solid ${s.done ? "#10b98140" : "#2a2850"}`, fontSize: 11, fontWeight: 700, color: s.done ? "#10b981" : "#4a4868" }}>{s.done ? "✓" : s.step}</div>
                      {i < 4 && <div style={{ width: 1, height: 16, background: "#1e1c3a", marginTop: 4 }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: s.done ? "#10b981" : "#a09dc0" }}>{s.l}</div>
                      <div style={{ fontSize: 10, color: "#6a679a" }}>{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ FOOTER ═══ */}
        <div style={{ marginTop: 16, padding: "12px 18px", borderRadius: 10, background: "#110f28", border: "1px solid #1e1c3a", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {[{ l: "Draft", c: "#94a3b8" }, { l: "Submitted", c: "#f59e0b" }, { l: "Approved", c: "#10b981" }, { l: "Revision", c: "#ef4444" }].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ padding: "3px 8px", borderRadius: 5, background: s.c + "12", border: `1px solid ${s.c}25`, color: s.c, fontSize: 10, fontWeight: 600 }}>{s.l}</div>
                {i < 3 && <span style={{ color: "#1e1c3a", fontSize: 12 }}>→</span>}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 9, color: "#2a2850" }}>
            Talent logs IST · Client sees {clientTZ} · Auto-approval after {autoApprovalHrs}h · ViraWorkX Timesheet v3
          </div>
        </div>
      </div>
    </div>
  );
}
