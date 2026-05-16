import { useEffect, useState, useTransition } from "react";
import { approveMemory, demoGetContext, demoSaveOrder, demoSearch, endDemoCall, fetchDashboard, rejectMemory, resetDemo, startDemoCall } from "./api";
import type { ActiveCall, CatalogMatch, Company, CompanyId, Customer, DashboardData, DemoQuery, MemoryCandidate, WorkflowEvent } from "./types";

const fallbackCompany: Company = {
  id: "costco",
  name: "Costco",
  hours: "Warehouse and delivery availability varies by location",
  catalogLabel: "5,329 Costco catalog rows: 5,011 local rows + 318 PR #6 seed rows",
  rules: [],
  officialFacts: [],
  catalogCount: 0,
  sampleItems: []
};

const fallback: DashboardData = {
  selectedCompanyId: "costco",
  companies: [fallbackCompany],
  company: fallbackCompany,
  activeCalls: [],
  customers: [],
  memoryCandidates: [],
  orders: [],
  workflowEvents: [],
  lastSearch: null,
  demoQueries: [],
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
  const [selectedCallId, setSelectedCallId] = useState("call_live_costco");
  const [eventLog, setEventLog] = useState<string[]>(["Dashboard ready. Costco brain is the primary demo."]);
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
      setEventLog((current) => [`${new Date().toLocaleTimeString()} ${parsed.event}`, ...current].slice(0, 7));
      if (parsed.event === "dashboard_updated") {
        setData(parsed.payload as DashboardData);
      } else {
        reload().catch(() => undefined);
      }
    };
    return () => socket.close();
  }, []);

  const selectedCompanyId = data.selectedCompanyId;
  const selectedCall = data.activeCalls.find((call) => call.id === selectedCallId) ?? data.activeCalls[0];
  const selectedCallCustomer = selectedCall
    ? data.customers.find((customer) => customer.phone === selectedCall.phone || customer.name === selectedCall.customerName)
    : undefined;
  const primaryCustomer = selectedCallCustomer ?? data.customers.find((customer) => customer.id !== "new-customer") ?? data.customers[0];
  const pendingMemories = data.memoryCandidates.filter((memory) => memory.status === "pending");

  async function runContextDemo(query?: string) {
    setError(null);
    try {
      await demoGetContext(selectedCompanyId, query);
      await reload();
      setEventLog((current) => [`${data.company.name} context loaded.`, ...current].slice(0, 7));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Context demo failed");
    }
  }

  async function runSearch(query: DemoQuery) {
    setError(null);
    try {
      await demoSearch(query.company, query.query, primaryCustomer?.id);
      await reload();
      setEventLog((current) => [`Catalog matched: ${query.query}`, ...current].slice(0, 7));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Catalog search failed");
    }
  }

  async function runOrderDemo() {
    setError(null);
    try {
      await demoSaveOrder(selectedCompanyId);
      await reload();
      setEventLog((current) => ["Order saved and memory candidates created.", ...current].slice(0, 7));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order demo failed");
    }
  }

  async function switchCompany(companyId: CompanyId) {
    setError(null);
    try {
      const response = await resetDemo(companyId);
      setData(response.dashboard as DashboardData);
      setSelectedCallId(companyId === "costco" ? "call_live_costco" : "call_live_starbucks");
      setEventLog((current) => [`Switched to separate ${companyId} brain.`, ...current].slice(0, 7));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Company switch failed");
    }
  }

  async function approve(id: string) {
    await approveMemory(id);
    await reload();
    setEventLog((current) => ["Customer Brain updated from approved memory.", ...current].slice(0, 7));
  }

  async function reject(id: string) {
    await rejectMemory(id);
    await reload();
    setEventLog((current) => ["Memory candidate rejected.", ...current].slice(0, 7));
  }

  async function runDemoAction(action: "start" | "end" | "reset") {
    setError(null);
    try {
      if (action === "start") await startDemoCall(selectedCompanyId);
      if (action === "end") await endDemoCall(selectedCompanyId);
      if (action === "reset") await resetDemo(selectedCompanyId);
      await reload();
      setEventLog((current) => [`Demo ${action} complete.`, ...current].slice(0, 7));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Demo ${action} failed`);
    }
  }

  return (
    <main className="app-shell">
      <Sidebar company={data.company} />
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="section-label">{data.company.name} Company Brain</p>
            <h1>Catalog concierge with memory</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" onClick={() => runDemoAction("start")} disabled={isPending}>Start call</button>
            <button className="ghost-button" onClick={() => runContextDemo()} disabled={isPending}>Simulate context</button>
            <button className="primary-button" onClick={runOrderDemo} disabled={isPending}>Confirm demo order</button>
            <button className="ghost-button" onClick={() => runDemoAction("reset")} disabled={isPending}>Reset</button>
          </div>
        </header>

        {error && <div className="error-strip">{error}</div>}

        <CompanySwitcher companies={data.companies} selected={selectedCompanyId} onSwitch={switchCompany} />
        <MetricRow data={data} />

        <div className="dashboard-grid">
          <LiveCalls calls={data.activeCalls} selectedCallId={selectedCall?.id} onSelect={setSelectedCallId} />
          {selectedCall && <CallDetail call={selectedCall} />}
          {primaryCustomer && <CustomerCard customer={primaryCustomer} />}
          <QueryPanel queries={data.demoQueries} onRun={runSearch} onContext={runContextDemo} />
          <WorkflowPanel events={data.workflowEvents} />
          <MatchPanel matches={data.lastSearch?.results ?? []} decision={data.lastSearch?.decision} question={data.lastSearch?.meta.clarifying_question} />
          <MemoryQueue memories={pendingMemories} onApprove={approve} onReject={reject} />
          <CompanyBrain data={data} />
          <EventLog entries={eventLog} />
        </div>
      </section>
    </main>
  );
}

function Sidebar({ company }: { company: Company }) {
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
        {["Live calls", "Workflow", "Catalog match", "Customer brain", "Company brain", "Memory review"].map((item, index) => (
          <a className={index === 0 ? "selected" : ""} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} key={item}>
            <span />
            {item}
          </a>
        ))}
      </nav>
      <div className="sidebar-card">
        <p>{company.name}</p>
        <code>{company.catalogLabel}</code>
        <code>POST /api/context</code>
        <code>POST /api/search</code>
      </div>
    </aside>
  );
}

function CompanySwitcher({ companies, selected, onSwitch }: { companies: Company[]; selected: CompanyId; onSwitch: (id: CompanyId) => void }) {
  return (
    <section className="company-switcher">
      {companies.map((company) => (
        <button className={company.id === selected ? "company-tab selected-company-tab" : "company-tab"} key={company.id} onClick={() => onSwitch(company.id)}>
          <strong>{company.name}</strong>
          <span>{company.catalogCount.toLocaleString()} rows · separate brain</span>
        </button>
      ))}
    </section>
  );
}

function MetricRow({ data }: { data: DashboardData }) {
  const metrics = [
    ["Catalog rows", data.company.catalogCount.toLocaleString(), data.company.catalogLabel],
    ["Active calls", data.metrics.activeCalls.toString(), "parallel now"],
    ["Orders confirmed", data.metrics.ordersConfirmed.toString(), "during demo"],
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

function QueryPanel({ queries, onRun, onContext }: { queries: DemoQuery[]; onRun: (query: DemoQuery) => void; onContext: (query: string) => void }) {
  return (
    <section className="panel query-panel" id="catalog-match">
      <div className="panel-heading">
        <h2>Demo queries</h2>
        <span>{queries.length} seeded</span>
      </div>
      <div className="query-list">
        {queries.slice(0, 5).map((query) => (
          <article className="query-card" key={`${query.company}-${query.query}`}>
            <span>{query.persona}</span>
            <p>{query.query}</p>
            <div>
              <button onClick={() => onRun(query)}>Search</button>
              <button onClick={() => onContext(query.query)}>Vapi context</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function WorkflowPanel({ events }: { events: WorkflowEvent[] }) {
  const latestByNode = new Map<string, WorkflowEvent>();
  for (const event of events) {
    if (!latestByNode.has(event.node)) latestByNode.set(event.node, event);
  }
  const nodes: WorkflowEvent["node"][] = ["Call", "Company Brain", "Customer Brain", "Catalog Matcher", "Review Gate", "Order/Memory Write"];
  return (
    <section className="panel workflow-panel" id="workflow">
      <div className="panel-heading">
        <h2>Working trace</h2>
        <span>n8n-style</span>
      </div>
      <div className="workflow-rail">
        {nodes.map((node) => {
          const event = latestByNode.get(node);
          return (
            <article className={`workflow-node ${event?.status ?? "idle"}`} key={node}>
              <span>{node}</span>
              <strong>{event?.label ?? "Waiting"}</strong>
              <p>{event?.detail ?? "Node will light up from backend events."}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MatchPanel({ matches, decision, question }: { matches: CatalogMatch[]; decision?: string; question?: string | null }) {
  return (
    <section className="panel match-panel">
      <div className="panel-heading">
        <h2>Catalog match</h2>
        <span>{decision ?? "waiting"}</span>
      </div>
      {question && <p className="review-note">{question}</p>}
      <div className="match-list">
        {matches.slice(0, 3).map((match) => (
          <article className="match-card" key={`${match.sku}-${match.rank}`}>
            <div>
              <strong>{match.name}</strong>
              <span>{Math.round(match.confidence * 100)}% · {match.confidence_label}</span>
            </div>
            <p>{match.category} · {match.price_band_seed} · {match.stock_seed}</p>
            {match.personalization_note && <small>{match.personalization_note}</small>}
            {match.review_reasons.length > 0 && <small>Review: {match.review_reasons.join(", ")}</small>}
          </article>
        ))}
        {!matches.length && <p className="empty-copy">Run a demo query to show ranked catalog matches.</p>}
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
      <TagGroup title="Recurring" items={customer.recurringItems} />
      <HouseholdMemory customer={customer} />
      <div className="last-order">
        <span>Last order</span>
        <p>{customer.lastOrder}</p>
      </div>
    </section>
  );
}

function HouseholdMemory({ customer }: { customer: Customer }) {
  if (!customer.household.length) return null;

  return (
    <div className="household-memory">
      <span>{customer.companyId === "costco" ? "Household / team memory" : "People memory"}</span>
      <div className="household-grid">
        {customer.household.map((member) => (
          <article key={member.name}>
            <strong>{member.name}</strong>
            {member.notes.slice(0, 3).map((note) => (
              <p key={note}>{note}</p>
            ))}
          </article>
        ))}
      </div>
    </div>
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
        <span>{data.company.catalogCount.toLocaleString()} rows</span>
      </div>
      <div className="brain-facts">
        {data.company.rules.slice(0, 4).map((rule) => <p key={rule}>{rule}</p>)}
      </div>
      <div className="menu-grid">
        {data.company.sampleItems.slice(0, 4).map((item) => (
          <article key={`${item.company_id}-${item.sku}`}>
            <div>
              <strong>{item.name}</strong>
              <span>{item.price_band_seed}</span>
            </div>
            <p>{item.category}</p>
            <small>{item.stock_seed} · {item.tags.slice(0, 3).join(", ")}</small>
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
        <h2>Event log</h2>
        <span>backend events</span>
      </div>
      {entries.map((entry) => (
        <p key={entry}>{entry}</p>
      ))}
    </section>
  );
}
