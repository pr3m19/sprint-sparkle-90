import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity, Users, Target, AlertTriangle, TrendingUp, Wrench,
  Shield, Database, KeyRound, RefreshCw, Box, Cpu, Radio,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  LineChart, Line,
} from "recharts";
import {
  LEADS, MEMBERS, PILLARS, TOOLS, QUARTERS, SPRINT_CAPACITY_PER_MEMBER,
  TEAM_CONFIG, generateQuarterData, totalForAllocation,
} from "@/lib/sre-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SRE Capacity Tracker" },
      { name: "description", content: "Mission-control view of sprint and quarterly effort allocation across the SRE team." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [quarter, setQuarter] = useState(QUARTERS[1]);
  const [jiraConnected, setJiraConnected] = useState(false);
  const data = useMemo(() => generateQuarterData(quarter), [quarter]);

  const quarterCapacity = MEMBERS.length * SPRINT_CAPACITY_PER_MEMBER * 6;
  const quarterSpent = data.reduce((s, a) => s + totalForAllocation(a), 0);
  const utilization = Math.round((quarterSpent / quarterCapacity) * 100);

  const pillarTotals = PILLARS.map((p) => ({
    pillar: p,
    points: data.reduce((s, a) => s + a.pillars[p], 0),
  }));

  const sprintBreakdown = Array.from({ length: 6 }, (_, i) => {
    const s = i + 1;
    const rows = data.filter((d) => d.sprint === s);
    return {
      sprint: `S${String(s).padStart(2, "0")}`,
      "Team Support": rows.reduce((x, r) => x + r.teamSupport, 0),
      Pillars: rows.reduce((x, r) => x + Object.values(r.pillars).reduce((a, b) => a + b, 0), 0),
      Initiatives: rows.reduce((x, r) => x + r.initiatives, 0),
      Tools: rows.reduce((x, r) => x + r.toolsSupport, 0),
      EKS: rows.reduce((x, r) => x + r.eksAdmin, 0),
      Adhoc: rows.reduce((x, r) => x + r.adhoc, 0),
    };
  });

  const teamSupportTarget = TEAM_CONFIG.pointsPerSprintPerMember * MEMBERS.length * 6;
  const teamSupportActual = data.reduce((s, a) => s + a.teamSupport, 0);
  const teamSupportDeviation = teamSupportActual - teamSupportTarget;

  const initiativeTarget = TEAM_CONFIG.initiativePointsPerQuarter * MEMBERS.length;
  const initiativeActual = data.reduce((s, a) => s + a.initiatives, 0);

  const systemStatus: "ok" | "warn" | "danger" =
    utilization > 110 ? "danger" : utilization > 95 ? "warn" : "ok";
  const statusLabel = {
    ok: "SYSTEMS NORMAL",
    warn: "ELEVATED LOAD",
    danger: "OVER CAPACITY",
  }[systemStatus];
  const statusColor = {
    ok: "var(--accent)",
    warn: "var(--warning)",
    danger: "var(--destructive)",
  }[systemStatus];

  return (
    <div className="min-h-screen text-foreground">
      <Header
        quarter={quarter}
        onQuarter={setQuarter}
        jiraConnected={jiraConnected}
        onConnect={() => setJiraConnected(true)}
      />

      {/* status strip */}
      <div className="border-b border-border bg-sidebar/60">
        <div className="mx-auto max-w-[1400px] px-6 py-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
              />
              <span style={{ color: statusColor }} className="font-semibold">{statusLabel}</span>
            </span>
            <span>NODE · sre-control</span>
            <span>QTR · {quarter}</span>
            <span>JIRA · {jiraConnected ? "linked" : "offline"}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>UPTIME 99.97%</span>
            <span>SYNCED {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-6 py-8 space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            code="HC.01"
            icon={<Users className="h-3.5 w-3.5" />}
            label="Team Headcount"
            value={MEMBERS.length.toString()}
            sub={`${TEAM_CONFIG.leads} leads · ${TEAM_CONFIG.supportedTeams} teams supported`}
          />
          <KpiCard
            code="UT.02"
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Quarter Utilization"
            value={`${utilization}%`}
            sub={`${quarterSpent} / ${quarterCapacity} SP`}
            tone={utilization > 100 ? "danger" : utilization > 90 ? "warn" : "ok"}
            spark={sprintBreakdown.map((s) => s["Team Support"] + s.Pillars + s.Initiatives + s.Tools + s.EKS + s.Adhoc)}
          />
          <KpiCard
            code="DV.03"
            icon={<Target className="h-3.5 w-3.5" />}
            label="Support Deviation"
            value={`${teamSupportDeviation > 0 ? "+" : ""}${teamSupportDeviation} SP`}
            sub={`target ${teamSupportTarget} · actual ${teamSupportActual}`}
            tone={Math.abs(teamSupportDeviation) > teamSupportTarget * 0.1 ? "warn" : "ok"}
          />
          <KpiCard
            code="IN.04"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="SRE Initiatives"
            value={`${initiativeActual} / ${initiativeTarget}`}
            sub="quarterly initiative points"
            tone={initiativeActual < initiativeTarget * 0.8 ? "warn" : "ok"}
          />
        </section>

        <Tabs defaultValue="sprints" className="space-y-6">
          <TabsList className="bg-sidebar border border-border p-1 rounded-sm h-auto w-full grid grid-cols-2 md:grid-cols-5 gap-1">
            {[
              ["sprints", "Sprint Breakdown"],
              ["pillars", "Pillars"],
              ["leads", "Leads & Teams"],
              ["members", "Members"],
              ["ops", "Tools & EKS"],
            ].map(([v, l]) => (
              <TabsTrigger
                key={v}
                value={v}
                className="rounded-sm text-[11px] font-bold uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border data-[state=active]:text-foreground text-muted-foreground py-2"
              >
                {l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="sprints" className="space-y-6">
            <Panel code="CHT.01" title="Effort allocation across 6 sprints" subtitle="Stacked story points per category">
              <Legend2
                items={[
                  ["Team Support", "var(--chart-1)"],
                  ["Pillars", "var(--chart-2)"],
                  ["Initiatives", "var(--chart-3)"],
                  ["Tools", "var(--chart-4)"],
                  ["EKS", "var(--chart-5)"],
                  ["Adhoc", "var(--destructive)"],
                ]}
              />
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sprintBreakdown} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="2 4" />
                    <XAxis dataKey="sprint" stroke="var(--muted-foreground)" tick={{ fontFamily: "var(--font-mono)", fontSize: 10 }} />
                    <YAxis stroke="var(--muted-foreground)" tick={{ fontFamily: "var(--font-mono)", fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                    <Bar dataKey="Team Support" stackId="a" fill="var(--chart-1)" />
                    <Bar dataKey="Pillars" stackId="a" fill="var(--chart-2)" />
                    <Bar dataKey="Initiatives" stackId="a" fill="var(--chart-3)" />
                    <Bar dataKey="Tools" stackId="a" fill="var(--chart-4)" />
                    <Bar dataKey="EKS" stackId="a" fill="var(--chart-5)" />
                    <Bar dataKey="Adhoc" stackId="a" fill="var(--destructive)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel code="CHT.02" title="Team support trend vs target" subtitle={`Target ${TEAM_CONFIG.pointsPerSprintPerMember} SP × ${MEMBERS.length} members per sprint`}>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={sprintBreakdown.map((s) => ({
                      sprint: s.sprint,
                      Actual: s["Team Support"],
                      Target: TEAM_CONFIG.pointsPerSprintPerMember * MEMBERS.length,
                    }))}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="2 4" />
                    <XAxis dataKey="sprint" stroke="var(--muted-foreground)" tick={{ fontFamily: "var(--font-mono)", fontSize: 10 }} />
                    <YAxis stroke="var(--muted-foreground)" tick={{ fontFamily: "var(--font-mono)", fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }} />
                    <Line type="monotone" dataKey="Actual" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--chart-1)" }} />
                    <Line type="monotone" dataKey="Target" stroke="var(--chart-2)" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="pillars">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Panel code="PLR.01" title="Pillar effort distribution" subtitle="Total story points this quarter">
                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={pillarTotals}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="pillar" stroke="var(--muted-foreground)" tick={{ fontFamily: "var(--font-mono)", fontSize: 11 }} />
                      <PolarRadiusAxis stroke="var(--muted-foreground)" tick={{ fontFamily: "var(--font-mono)", fontSize: 9 }} />
                      <Radar name="Points" dataKey="points" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.4} />
                      <Tooltip contentStyle={tooltipStyle} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
              <Panel code="PLR.02" title="Pillar ownership" subtitle="1–2 SP / sprint per member commitment">
                <div className="space-y-4">
                  {pillarTotals.map((p) => {
                    const max = Math.max(...pillarTotals.map((x) => x.points));
                    const pct = (p.points / max) * 100;
                    return (
                      <div key={p.pillar} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-accent">{pillarIcon(p.pillar)}</span>
                            <span className="font-medium uppercase tracking-wide">{p.pillar}</span>
                          </div>
                          <span className="font-mono text-muted-foreground">{p.points.toString().padStart(3, "0")} SP</span>
                        </div>
                        <div className="h-1 bg-muted rounded-none overflow-hidden">
                          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>
          </TabsContent>

          <TabsContent value="leads">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LEADS.map((lead, idx) => {
                const members = MEMBERS.filter((m) => m.leadId === lead.id);
                const points = data.filter((d) => members.some((m) => m.id === d.memberId))
                  .reduce((s, a) => s + totalForAllocation(a), 0);
                const cap = members.length * SPRINT_CAPACITY_PER_MEMBER * 6;
                const pct = Math.round((points / cap) * 100);
                const tone = pct > 100 ? "var(--destructive)" : pct > 90 ? "var(--warning)" : "var(--accent)";
                return (
                  <div key={lead.id} className="border border-border bg-card/40 rounded-sm">
                    <div className="border-b border-border px-4 py-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      <span>LD.{String(idx + 1).padStart(2, "0")} · {lead.id}</span>
                      <span style={{ color: tone }}>{pct}% util</span>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <div className="text-lg font-semibold">{lead.name}</div>
                        <div className="text-xs text-muted-foreground">{members.length} members · {points}/{cap} SP</div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {lead.teams.map((t) => (
                          <Badge key={t} variant="outline" className="rounded-sm font-mono text-[10px] uppercase tracking-wider">
                            {t}
                          </Badge>
                        ))}
                      </div>
                      <div className="h-1 bg-muted overflow-hidden">
                        <div className="h-full" style={{ width: `${Math.min(pct, 100)}%`, background: tone }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="members">
            <Panel code="MBR.01" title="Member-level allocation" subtitle="Quarter totals across all categories">
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground border-y border-border bg-sidebar/40">
                      <th className="py-2 px-5 font-medium">Member</th>
                      <th className="py-2 px-2 font-medium">Team</th>
                      <th className="py-2 px-2 font-medium text-right">Support</th>
                      <th className="py-2 px-2 font-medium text-right">Pillars</th>
                      <th className="py-2 px-2 font-medium text-right">Init.</th>
                      <th className="py-2 px-2 font-medium text-right">Tools</th>
                      <th className="py-2 px-2 font-medium text-right">EKS</th>
                      <th className="py-2 px-2 font-medium text-right">Adhoc</th>
                      <th className="py-2 px-2 font-medium text-right">Total</th>
                      <th className="py-2 px-5 font-medium">Capacity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MEMBERS.map((m) => {
                      const rows = data.filter((d) => d.memberId === m.id);
                      const support = rows.reduce((s, r) => s + r.teamSupport, 0);
                      const pillars = rows.reduce((s, r) => s + Object.values(r.pillars).reduce((a, b) => a + b, 0), 0);
                      const init = rows.reduce((s, r) => s + r.initiatives, 0);
                      const tools = rows.reduce((s, r) => s + r.toolsSupport, 0);
                      const eks = rows.reduce((s, r) => s + r.eksAdmin, 0);
                      const adhoc = rows.reduce((s, r) => s + r.adhoc, 0);
                      const total = support + pillars + init + tools + eks + adhoc;
                      const cap = SPRINT_CAPACITY_PER_MEMBER * 6;
                      const pct = Math.round((total / cap) * 100);
                      const tone = pct > 100 ? "var(--destructive)" : pct > 90 ? "var(--warning)" : "var(--accent)";
                      return (
                        <tr key={m.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-sm border border-border bg-sidebar flex items-center justify-center text-[10px] font-mono font-semibold text-accent">
                                {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-medium">{m.name}</div>
                                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{m.role}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-muted-foreground text-xs">{m.primaryTeam}</td>
                          <td className="py-2.5 px-2 text-right font-mono">{support}</td>
                          <td className="py-2.5 px-2 text-right font-mono">{pillars}</td>
                          <td className="py-2.5 px-2 text-right font-mono">{init}</td>
                          <td className="py-2.5 px-2 text-right font-mono">{tools}</td>
                          <td className="py-2.5 px-2 text-right font-mono">{eks}</td>
                          <td className="py-2.5 px-2 text-right font-mono">{adhoc}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-semibold">{total}</td>
                          <td className="py-2.5 px-5 w-36">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 bg-muted overflow-hidden">
                                <div className="h-full" style={{ width: `${Math.min(pct, 100)}%`, background: tone }} />
                              </div>
                              <span className="text-[10px] font-mono w-10 text-right" style={{ color: tone }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="ops">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Panel code="OPS.01" title="Tools ownership" subtitle="10 tools recently transitioned to SRE">
                <div className="grid grid-cols-2 gap-1.5">
                  {TOOLS.map((t, i) => (
                    <div key={t} className="flex items-center justify-between border border-border bg-sidebar/40 px-3 py-2 rounded-sm">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-3 w-3 text-accent" />
                        <span className="text-xs">{t}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">T.{String(i + 1).padStart(2, "0")}</span>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel code="OPS.02" title="EKS administration" subtitle="Sustained admin effort across clusters">
                <div className="space-y-3">
                  <OpsRow icon={<Box className="h-3.5 w-3.5" />} label="Quarter EKS effort" value={data.reduce((s, a) => s + a.eksAdmin, 0)} />
                  <OpsRow icon={<Wrench className="h-3.5 w-3.5" />} label="Tools support effort" value={data.reduce((s, a) => s + a.toolsSupport, 0)} />
                  <OpsRow icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Adhoc / unplanned" value={data.reduce((s, a) => s + a.adhoc, 0)} tone="warn" />
                </div>
              </Panel>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Header({
  quarter, onQuarter, jiraConnected, onConnect,
}: {
  quarter: string; onQuarter: (q: string) => void;
  jiraConnected: boolean; onConnect: () => void;
}) {
  const [token, setToken] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-border bg-sidebar/90 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-sm border border-primary/40 bg-primary/15 flex items-center justify-center">
            <Cpu className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">SRE Capacity Tracker</h1>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Operational velocity · resource allocation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-sm border border-border bg-card/60 p-0.5">
            {QUARTERS.map((q) => (
              <button
                key={q}
                onClick={() => onQuarter(q)}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-[2px] transition-colors ${
                  q === quarter ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="rounded-sm font-mono text-[11px] uppercase tracking-widest">
            <RefreshCw className="h-3 w-3 mr-1.5" /> Sync
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className={`rounded-sm font-mono text-[11px] uppercase tracking-widest ${
                  jiraConnected
                    ? "bg-accent/15 text-accent border border-accent/40 hover:bg-accent/25"
                    : "bg-accent text-accent-foreground hover:bg-accent/90"
                }`}
              >
                <KeyRound className="h-3 w-3 mr-1.5" />
                {jiraConnected ? "Jira Linked" : "Connect Jira"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect Jira</DialogTitle>
                <DialogDescription>
                  Paste your Atlassian personal access token. We'll pull sprints, story points and labels per member.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="jira-url">Jira base URL</Label>
                  <Input id="jira-url" placeholder="https://yourorg.atlassian.net" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jira-email">Email</Label>
                  <Input id="jira-email" type="email" placeholder="you@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jira-token">Personal Access Token</Label>
                  <Input id="jira-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ATATT3xFfGF0..." />
                </div>
                <Button className="w-full" onClick={() => { onConnect(); setOpen(false); }}>
                  Save & sync
                </Button>
                <p className="text-xs text-muted-foreground">
                  Token is stored locally in this prototype. Hook up Lovable Cloud to persist securely.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}

function KpiCard({
  code, icon, label, value, sub, tone = "neutral", spark,
}: {
  code: string;
  icon: React.ReactNode; label: string; value: string; sub: string;
  tone?: "neutral" | "ok" | "warn" | "danger";
  spark?: number[];
}) {
  const color =
    tone === "danger" ? "var(--destructive)" :
    tone === "warn" ? "var(--warning)" :
    tone === "ok" ? "var(--accent)" :
    "var(--foreground)";

  return (
    <div className="border border-border bg-card/40 rounded-sm overflow-hidden group hover:border-primary/40 transition-colors">
      <div className="px-4 py-2 border-b border-border bg-sidebar/40 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        <span>{code} · {label}</span>
        {icon}
      </div>
      <div className="p-4 relative">
        <div className="text-3xl font-mono font-semibold tracking-tight" style={{ color }}>
          {value}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
        {spark && spark.length > 0 && (
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="absolute right-3 top-3 h-8 w-20 opacity-70">
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              points={spark.map((v, i) => {
                const max = Math.max(...spark);
                const min = Math.min(...spark);
                const x = (i / (spark.length - 1)) * 100;
                const y = 28 - ((v - min) / Math.max(1, max - min)) * 24;
                return `${x},${y}`;
              }).join(" ")}
            />
          </svg>
        )}
      </div>
    </div>
  );
}

function Panel({ code, title, subtitle, children }: { code: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-card/40 rounded-sm">
      <div className="border-b border-border px-5 py-2.5 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{code}</div>
          <h3 className="text-sm font-semibold mt-0.5">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <Radio className="h-3 w-3 text-accent animate-pulse" />
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Legend2({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-4">
      {items.map(([label, color]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="h-2 w-2" style={{ background: color }} />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

function OpsRow({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "warn" }) {
  const color = tone === "warn" ? "var(--warning)" : "var(--foreground)";
  return (
    <div className="flex items-center justify-between border border-border bg-sidebar/40 px-4 py-3 rounded-sm">
      <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
        <span className="text-accent">{icon}</span>
        <span className="uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-2xl font-mono font-semibold" style={{ color }}>
        {value}<span className="text-[10px] text-muted-foreground ml-1">SP</span>
      </span>
    </div>
  );
}

function pillarIcon(p: string) {
  const map: Record<string, React.ReactNode> = {
    Cost: <TrendingUp className="h-3.5 w-3.5" />,
    Monitoring: <Activity className="h-3.5 w-3.5" />,
    Security: <Shield className="h-3.5 w-3.5" />,
    AI: <Database className="h-3.5 w-3.5" />,
    Observability: <AlertTriangle className="h-3.5 w-3.5" />,
  };
  return map[p] ?? <Cpu className="h-3.5 w-3.5" />;
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "2px",
  color: "var(--popover-foreground)",
  fontSize: "11px",
  fontFamily: "var(--font-mono)",
};
