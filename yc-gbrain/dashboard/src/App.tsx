import { useEffect, useState, useTransition } from "react";
import { approveMemory, demoGetContext, demoSaveOrder, endDemoCall, fetchDashboard, rejectMemory, resetDemo, startDemoCall } from "./api";
import type { ActiveCall, Customer, DashboardData, MemoryCandidate } from "./types";

const fallback: DashboardData = {
  company: {
    id: "sunrise-coffee",
    name: "Sunrise Coffee",
    hours: "6:30 AM - 5:00 PM",
    rules: [],
    menu: []
  },
  activeCalls: [],
  customers: [],
  memoryCandidates: [],
  orders: [],
  metrics: {
    activeCalls: 0,
    ordersConfirmed: 0,
    humanEscalations: 0,
    recoveredRevenueToday: 0
  }
};

function minutesAgo(startedAt: string) {
  const diff = Math.max(0, Date.now() - new Date(startedAt).getTime());
  return `${Math.max(1, Math.round(diff / 60_000))}m`;
}

function statusClass(status: ActiveCall["status"]) {
  if (status === "confirmed") return "success";
  if (status === "escalated") return "danger";
  if (status === "ordering") return "active";
  if (status === "ringing") return "active";
  return "quiet";
}

export default function App() {
  const [data, setData] = useState<DashboardData>(fallback);
  const [selectedCallId, setSelectedCallId] = useState("call_live_aayushya");
  const [eventLog, setEventLog] = useState<string[]>(["Dashboard ready. Waiting for Vapi calls."]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function reload() {
    const next = await fetchDashboard();
    startTransition(() => setData(next));
  }

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Load failed"));

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
    socket.onmessage = (message) => {
      const parsed = JSON.parse(message.data) as { event: string; payload: unknown };
      setEventLog((current) => [`${new Date().toLocaleTimeString()} ${parsed.event}`, ...current].slice(0, 6));
      if (parsed.event === "dashboard_updated") {
        setData(parsed.payload as DashboardData);
      } else {
        reload().catch(() => undefined);
      }
    };
    return () => socket.close();
  }, []);

  const selectedCall = data.activeCalls.find((call) => call.id === selectedCallId) ?? data.activeCalls[0];
  const primaryCustomer = data.customers.find((customer) => customer.id === "aayushya") ?? data.customers[0];
  const pendingMemories = data.memoryCandidates.filter((memory) => memory.status === "pending");

  async function runContextDemo() {
    setError(null);
    try {
      await demoGetContext();
      await reload();
      setEventLog((current) => ["Context loaded for Aayushya.", ...current].slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Context demo failed");
    }
  }

  async function runOrderDemo() {
    setError(null);
    try {
      await demoSaveOrder();
      await reload();
      setEventLog((current) => ["Order saved and memory candidates created.", ...current].slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order demo failed");
    }
  }

  async function approve(id: string) {
    await approveMemory(id);
    await reload();
    setEventLog((current) => ["Customer Brain updated from approved memory.", ...current].slice(0, 6));
  }

  async function reject(id: string) {
    await rejectMemory(id);
    await reload();
    setEventLog((current) => ["Memory candidate rejected.", ...current].slice(0, 6));
  }

  async function runDemoAction(action: "start" | "end" | "reset") {
    setError(null);
    try {
      if (action === "start") await startDemoCall();
      if (action === "end") await endDemoCall();
      if (action === "reset") await resetDemo();
      await reload();
      setEventLog((current) => [`Demo ${action} complete.`, ...current].slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Demo ${action} failed`);
    }
  }

  return (
    <main className="app-shell">
      <Sidebar />
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="section-label">Sunrise Coffee</p>
            <h1>Phone concierge with memory</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" onClick={() => runDemoAction("start")} disabled={isPending}>Start call</button>
            <button className="ghost-button" onClick={runContextDemo} disabled={isPending}>Simulate context</button>
            <button className="primary-button" onClick={runOrderDemo} disabled={isPending}>Confirm demo order</button>
            <button className="ghost-button" onClick={() => runDemoAction("reset")} disabled={isPending}>Reset</button>
          </div>
        </header>

        {error && <div className="error-strip">{error}</div>}

        <MetricRow data={data} />

        <div className="dashboard-grid">
          <LiveCalls calls={data.activeCalls} selectedCallId={selectedCall?.id} onSelect={setSelectedCallId} />
          {selectedCall && <CallDetail call={selectedCall} />}
          {primaryCustomer && <CustomerCard customer={primaryCustomer} />}
          <MemoryQueue memories={pendingMemories} onApprove={approve} onReject={reject} />
          <CompanyBrain data={data} />
          <EventLog entries={eventLog} />
        </div>
      </section>
    </main>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">P</div>
        <div>
          <strong>Pulse</strong>
          <span>Voice memory OS</span>
        </div>
      </div>
      <nav>
        {["Live calls", "Customer brain", "Company brain", "Insights", "Memory review"].map((item, index) => (
          <a className={index === 0 ? "selected" : ""} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} key={item}>
            <span />
            {item}
          </a>
        ))}
      </nav>
      <div className="sidebar-card">
        <p>Vapi tools</p>
        <code>POST /api/context</code>
        <code>POST /api/save_order</code>
      </div>
    </aside>
  );
}

function MetricRow({ data }: { data: DashboardData }) {
  const metrics = [
    ["Active calls", data.metrics.activeCalls.toString(), "parallel now"],
    ["Orders confirmed", data.metrics.ordersConfirmed.toString(), "during demo"],
    ["Human escalations", data.metrics.humanEscalations.toString(), "safe handoff"],
    ["Recovered today", `$${data.metrics.recoveredRevenueToday}`, "estimated"]
  ];

  return (
    <section className="metric-row">
      {metrics.map(([label, value, detail]) => (
        <article className="metric-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <p>{detail}</p>
        </article>
      ))}
    </section>
  );
}

function LiveCalls({ calls, selectedCallId, onSelect }: { calls: ActiveCall[]; selectedCallId?: string; onSelect: (id: string) => void }) {
  return (
    <section className="panel live-calls" id="live-calls">
      <div className="panel-heading">
        <h2>Live calls</h2>
        <span className="pulse-dot">live</span>
      </div>
      <div className="call-list">
        {calls.map((call) => (
          <button className={call.id === selectedCallId ? "call-row selected-call" : "call-row"} key={call.id} onClick={() => onSelect(call.id)}>
            <span className={`status-dot ${statusClass(call.status)}`} />
            <div>
              <strong>{call.customerName}</strong>
              <p>{call.intent}</p>
            </div>
            <em>{minutesAgo(call.startedAt)}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function CallDetail({ call }: { call: ActiveCall }) {
  return (
    <section className="panel call-detail">
      <div className="panel-heading">
        <h2>{call.customerName}</h2>
        <span className={`status-pill ${statusClass(call.status)}`}>{call.status}</span>
      </div>
      <p className="intent">{call.intent}</p>
      <div className="order-box">
        <span>Current order</span>
        {call.currentOrder.length ? call.currentOrder.map((item) => <strong key={item}>{item}</strong>) : <strong>No order yet</strong>}
      </div>
      <div className="transcript">
        {call.transcript.map((line, index) => (
          <p key={`${index}-${line}`}>{line}</p>
        ))}
      </div>
    </section>
  );
}

function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <section className="panel customer-card" id="customer-brain">
      <div className="panel-heading">
        <h2>Customer brain</h2>
        <span>{Math.round(customer.confidence * 100)}% confidence</span>
      </div>
      <div className="customer-hero">
        <div className="avatar">{customer.name.slice(0, 1)}</div>
        <div>
          <strong>{customer.name}</strong>
          <p>{customer.style}</p>
        </div>
      </div>
      <TagGroup title="Likes" items={customer.likes} />
      <TagGroup title="Avoids" items={customer.avoids} tone="warning" />
      <div className="last-order">
        <span>Last order</span>
        <p>{customer.lastOrder}</p>
      </div>
    </section>
  );
}

function TagGroup({ title, items, tone }: { title: string; items: string[]; tone?: "warning" }) {
  return (
    <div className="tag-group">
      <span>{title}</span>
      <div>
        {items.map((item) => (
          <em className={tone === "warning" ? "warning-tag" : ""} key={item}>{item}</em>
        ))}
      </div>
    </div>
  );
}

function MemoryQueue({ memories, onApprove, onReject }: { memories: MemoryCandidate[]; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  return (
    <section className="panel memory-panel" id="memory-review">
      <div className="panel-heading">
        <h2>Memory learned</h2>
        <span>{memories.length} pending</span>
      </div>
      {memories.slice(0, 4).map((memory) => (
        <article className="memory-card" key={memory.id}>
          <div>
            <strong>{memory.claim}</strong>
            <p>{memory.evidence}</p>
          </div>
          <div className="memory-actions">
            <button onClick={() => onApprove(memory.id)}>Approve</button>
            <button className="reject-button" onClick={() => onReject(memory.id)}>Reject</button>
          </div>
        </article>
      ))}
    </section>
  );
}

function CompanyBrain({ data }: { data: DashboardData }) {
  return (
    <section className="panel company-panel" id="company-brain">
      <div className="panel-heading">
        <h2>Company brain</h2>
        <span>{data.company.hours}</span>
      </div>
      <div className="menu-grid">
        {data.company.menu.slice(0, 4).map((item) => (
          <article key={item.name}>
            <div>
              <strong>{item.name}</strong>
              <span>${item.price.toFixed(2)}</span>
            </div>
            <p>{item.description}</p>
            <small>{item.stock} · {item.modifiers.slice(0, 3).join(", ")}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function EventLog({ entries }: { entries: string[] }) {
  return (
    <section className="panel event-panel">
      <div className="panel-heading">
        <h2>Workflow trace</h2>
        <span>GStack demo</span>
      </div>
      {entries.map((entry) => (
        <p key={entry}>{entry}</p>
      ))}
    </section>
  );
}
